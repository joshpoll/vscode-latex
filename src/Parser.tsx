import styles from "./App.module.css";
import { createSignal } from "solid-js";
import "./App.module.css";
import * as ntc from "./ntc";

function escapeLaTeXSpecialChars(str: string): string {
  return str
    .replace(/\\/g, "\\textbackslash")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/~/g, "\\textasciitilde")
    .replace(/\^/g, "\\textasciicircum");
}

function Parser() {
  const [htmlInput, setHtmlInput] = createSignal("");
  const [latexOutput, setLatexOutput] = createSignal("");

  const handleConvert = () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlInput(), "text/html");

    let latexContent = "";
    let colorDefinitions: { [key: string]: string } = {};

    function getColorName(rgb: string): string {
      if (!colorDefinitions[rgb]) {
        colorDefinitions[rgb] = ntc
          .name(
            ntc.rgbToHex(
              parseInt(rgb.split(",")[0]),
              parseInt(rgb.split(",")[1]),
              parseInt(rgb.split(",")[2])
            )
          )[1]
          .replace(/\s/g, "");
      }
      return colorDefinitions[rgb];
    }

    function traverseAndConvert(node: Node, currentColor?: string) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;

        // Handle newline for block elements
        if (
          (element.tagName === "DIV" || element.tagName === "P") &&
          latexContent !== ""
        ) {
          latexContent += "\\\\\n"; // Add a newline in LaTeX
        } else if (element.tagName === "BR") {
          latexContent += "\\\\\n"; // Add a newline in LaTeX
          return; // BR doesn't have children, so return early
        }

        const colorMatch =
          element.style.color &&
          element.style.color.match(/^rgb\((\d+), (\d+), (\d+)\)$/);

        let childColor = currentColor;

        if (colorMatch) {
          const [_, r, g, b] = colorMatch;
          const colorRGB = `${r},${g},${b}`;
          childColor = getColorName(colorRGB);
        }

        // Recurse for child nodes
        for (let child of Array.from(node.childNodes)) {
          traverseAndConvert(child, childColor);
        }
      } else if (node.nodeType === Node.TEXT_NODE) {
        if (currentColor) {
          // If there's a current color, wrap the text content in the color command
          latexContent += `\\textcolor{${currentColor}}{${escapeLaTeXSpecialChars(
            node.textContent ?? ""
          )}}`;
        } else {
          // If there's no current color, just append the text content
          latexContent += escapeLaTeXSpecialChars(node.textContent ?? "");
        }
      }
    }

    traverseAndConvert(doc.body);

    // Construct the color definitions at the beginning.
    let colorDefs = "";
    for (let rgb in colorDefinitions) {
      const [r, g, b] = rgb.split(",");
      colorDefs += `\\definecolor{${colorDefinitions[rgb]}}{RGB}{${r},${g},${b}}\n`;
    }

    const preamble = `\\newsavebox\\spacewd
\\savebox\\spacewd{\\texttt{ }}
\\newenvironment{code}{\\par\\catcode32=\\active \\setlength{\\parindent}{0pt}\\ttfamily}{\\par}
{
\\catcode32=\\active %
\\gdef {\\makebox[\\wd\\spacewd][l]{%
\\phantom{\\textcolor{white}{\\fontfamily{lmtt}\\selectfont\\large\\smash{\\char32}}}}}% 
}
\\begin{code}
`;

    setLatexOutput(preamble + colorDefs + latexContent + "\n\\end{code}");
  };

  const [copyFeedback, setCopyFeedback] = createSignal("");
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(latexOutput()).then(
      function () {
        console.log("Copied to clipboard successfully!");
        setCopyFeedback("Copied to clipboard!");
        setTimeout(() => setCopyFeedback(""), 2000); // Clear feedback after 2 seconds
      },
      function (err) {
        console.error("Could not copy text: ", err);
        setCopyFeedback("Failed to copy.");
        setTimeout(() => setCopyFeedback(""), 2000); // Clear feedback after 2 seconds
      }
    );
  };

  const handleInput = (
    e: InputEvent & {
      currentTarget: HTMLDivElement;
      target: Element;
    }
  ) => {
    setHtmlInput(e.target.innerHTML);
    console.log(htmlInput());
    handleConvert();
  };

  return (
    <div>
      <h1>VSCode to LaTeX Converter</h1>
      <p>
        This tool converts VSCode highlighted code to LaTeX. Simply copy your
        highlighted code from VSCode and paste it in the box below. Then click
        the "Copy to Clipboard" button to copy the LaTeX code to your clipboard.
      </p>
      <h3>Putting the LaTeX code in your LaTeX document</h3>
      <p>
        To put the LaTeX code in your LaTeX document, you need to place it in an
        environment like this one:
      </p>
      <pre>
        {`\\\\newsavebox\\\\spacewd
\\\\savebox\\\\spacewd{\\\\texttt{ }}
\\\\newenvironment{code}{\\\\par\\\\catcode32=\\\\active \\\\setlength{\\\\parindent}{0pt}\\\\ttfamily}{\\\\par}
{
\\\\catcode32=\\\\active %
\\\\gdef {\\\\makebox[\\\\wd\\\\spacewd][l]{%
\\\\phantom{\\\\textcolor{white}{\\\\fontfamily{lmtt}\\\\selectfont\\\\large\\\\smash{\\\\char32}}}}}% 
}`}
      </pre>
      <p>
        <b>This definition is automatically included in the output.</b>
      </p>
      <div
        contentEditable={true}
        suppress-content-editable-warning={true} // To suppress the warning
        style={{
          width: "80%",
          "min-height": "100px",
          border: "1px solid #ccc",
          padding: "10px",
          "margin-bottom": "20px",
        }}
        onInput={handleInput}
        // placeholder="Paste your VSCode highlighted code here"
      ></div>
      <button onClick={handleCopyToClipboard}>Copy to Clipboard</button>
      <p>{copyFeedback()}</p>
      <h2>LaTeX Output</h2>
      <textarea
        value={latexOutput()}
        readOnly
        rows={10}
        style={{ width: "80%", "margin-top": "20px" }}
      ></textarea>
    </div>
  );
}

export default Parser;
