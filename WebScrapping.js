import { launch } from "puppeteer";
import fs from 'fs';

var filename = "out-grinder-1"

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
var count = 0;

async function go() {

    const browser = await launch({
        "headless": false,
        "args": ["--window-size=1920,1080"],
        "defaultViewport": {
            "width": 1920,
            "height": 1080
        }
    })
    const page = await browser.newPage()


    await page.setRequestInterception(true);

    page.on('request', (req) => {
        if (req.resourceType() === 'image') {
            req.abort();
        } else {
            req.continue();
        }
    });


    var data = JSON.parse(fs.readFileSync(filename + ".json", "utf-8"));

    for (var i in data) {

        if (count % 300 == 0 && count != 0) {
            await delay(1000 * 60 * 2);
        }


        if (data[i].details == undefined || Object.keys(data[i].details).length == 0 || data[i].ratings == undefined) {

            console.log("Product : " + i + " out of " + data.length);
            await page.goto(data[i].link);
            count += 1

            if (data[i].details == undefined || Object.keys(data[i].details).length == 0) {

                var details = await page.evaluate(() => {
                    function tableToDictionary(tableElement) {
                        // Initialize an empty dictionary object
                        var dictionary = {};

                        // Get all rows of the table element
                        var rows = tableElement.getElementsByTagName('tr');

                        // Loop through each row
                        for (var i = 0; i < rows.length; i++) {
                            // Get the cells of the current row
                            var key = rows[i].querySelector('th');
                            var val = rows[i].querySelector('td');

                            dictionary[key.innerText] = val.innerText;

                        }

                        // Return the dictionary object
                        return dictionary;
                    }

                    return tableToDictionary(document.getElementById("productDetails_detailBullets_sections1"));

                });
                console.log(details);
                data[i].details = details;
            }



            if (data[i].ratings == undefined) {
                var ratings = await page.evaluate(() => {
                    var rows = document.querySelectorAll("#histogramTable")[1].querySelectorAll('tr');

                    var l = [];
                    for (var i = 0; i < rows.length; i++) {
                        l.push(parseInt(rows[i].querySelectorAll("td")[2].innerText.replace("%", "")))

                    }

                    return l;
                });

                data[i].ratings = ratings;
            }

        }

        console.log(data[i].ratings);

        fs.writeFileSync(filename + ".json", JSON.stringify(data, null, 4), "utf-8");

    }

    await browser.close()

};

function main() {
    try {
        (async() => {
            await go();
        })();
    } catch (e) {
        setTimeout(main, 10000);
    }
}

main();