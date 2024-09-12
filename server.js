const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Arrays to store the scraped data
  let projects = [];
  let investorsList = [];

  // Function to scrape data from a single page
  async function scrapePage(pageNumber) {
    const url = `https://www.coincarp.com/fundraising/?page=${pageNumber}`;
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Wait for projects to load
    await page.waitForSelector('.fundraising-list-item');

    // Extract projects and investors
    const projectElements = await page.$$('.fundraising-list-item');

    for (const projectElement of projectElements) {
      try {
        // Extract project name
        const projectName = await projectElement.$eval('h3', el => el.innerText.trim());

        // Extract investor names and links
        let investors = await projectElement.$$eval('.investor-name', investors => 
          investors.map(investor => ({
            name: investor.innerText.trim(),
            link: investor.href
          }))
        );

        // Check for "three dots" button to reveal more investors
        const moreButton = await projectElement.$('.investor-more');
        if (moreButton) {
          await moreButton.click();
          await page.waitForTimeout(1000); // Wait for additional investors to load
          
          // Re-extract the updated list of investors
          investors = await projectElement.$$eval('.investor-name', investors => 
            investors.map(investor => ({
              name: investor.innerText.trim(),
              link: investor.href
            }))
          );
        }

        // Append data to arrays
        projects.push(projectName);
        investorsList.push(investors);
      } catch (error) {
        console.error('Error extracting project:', error);
      }
    }
  }

  // Loop through pages 1 to 324
  for (let pageNum = 1; pageNum <= 2; pageNum++) {
    console.log(`Scraping page ${pageNum}`);
    await scrapePage(pageNum);
  }

  // Close the browser
  await browser.close();

  // Save data to CSV file
  const csvData = projects.map((project, index) => {
    const investors = investorsList[index]
      .map(investor => `${investor.name} (${investor.link})`)
      .join('; ');
    return `${project},${investors}`;
  }).join('\n');

  fs.writeFileSync('coincarp_fundraising_investors.csv', csvData);
  console.log('Data has been saved to coincarp_fundraising_investors.csv');
})();
