const puppeteer = require("puppeteer");

exports.handler = async (event, context) => {
  const url = event.url;

  if (!url) {
    return {
      statusCode: 400,
      body: "Missing url parameter.",
    };
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage();
    await page.goto(url);

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

    await browser.close();

    const result = textContent.replace(/\s+/g, " ").trim();

    return {
      statusCode: 200,
      body: JSON.stringify({ result }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: "Error extracting text from the webpage.",
    };
  }
};
