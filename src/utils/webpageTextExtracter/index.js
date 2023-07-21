const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

exports.handler = async (event, context) => {
  console.log("Event received:", event);

  const url = event.url;

  if (!url) {
    console.log("Missing URL parameter.");
    return {
      statusCode: 400,
      body: "Missing url parameter.",
    };
  }

  let browser = null;
  let result = null;

  try {
    console.log("Setting up browser options.");
    // Set up browser options
    const browserOptions = {
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    };

    console.log("Launching browser.");
    // Launch browser
    browser = await puppeteer.launch(browserOptions);

    console.log("Opening new page.");
    const page = await browser.newPage();
    try {
      console.log("Navigating to URL:", url);
      await page.goto(url);
      console.log("Navigated to URL.");
    } catch (error) {
      console.error("Error navigating to URL:", error);
      throw error;
    }

    try {
      console.log("Extracting text content from page.");
      const textContent = await page.evaluate(() => {
        const isHidden = (el) => {
          const style = window.getComputedStyle(el);
          return (
            style.width === "0" ||
            style.height === "0" ||
            style.opacity === "0" ||
            style.display === "none" ||
            style.visibility === "hidden"
          );
        };

        const isIgnored = (el) => {
          return el.tagName === "NAV" || el.tagName === "FOOTER";
        };

        const extractVisibleText = (parent) => {
          let nodesArray = Array.from(parent.childNodes);
          let result = "";

          nodesArray.forEach((node) => {
            // If the node is an element node, check if it is hidden or ignored
            if (
              node.nodeType === Node.ELEMENT_NODE &&
              !isHidden(node) &&
              !isIgnored(node)
            ) {
              result += ` ${extractVisibleText(node)}`;
            } else if (node.nodeType === Node.TEXT_NODE) {
              // If the node is a text node, add its text
              result += ` ${node.nodeValue}`;
            }
          });

          return result;
        };

        return extractVisibleText(document.body);
      });
      console.log("Extracted text content:", textContent);
      console.log("Cleaning up extracted text.");
      result = textContent.replace(/\s+/g, " ").trim();
      console.log("Cleaned up extracted text:", result);
    } catch (error) {
      console.error("Error extracting text content from page:", error);
      throw error;
    }

    console.log("Returning result.");
    return {
      statusCode: 200,
      body: JSON.stringify({ result }),
    };
  } catch (error) {
    console.error("Error occurred:", error);
    return {
      statusCode: 500,
      body: "Error extracting text from the webpage.",
    };
  }
  // finally {
  //   console.log("Closing browser.");
  //   // Make sure to close the browser at the end to clean up properly
  //   if (browser !== null) {
  //     await browser.close();
  //   }
  // }
};
