function encode64(data) {
	let r = "";
	for (let i = 0, n = data.length; i < n; i += 3) {
		r += append3bytes(
			data[i],
			i + 1 < n ? data[i + 1] : 0,
			i + 2 < n ? data[i + 2] : 0);
	}
	return r;
}

function append3bytes(b1, b2, b3) {
	const c1 = b1 >> 2;
	const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
	const c3 = ((b2 & 0xF) << 2) | (b3 >> 6);
	const c4 = b3 & 0x3F;
	return encode6bit(c1 & 0x3F) +
		encode6bit(c2 & 0x3F) +
		encode6bit(c3 & 0x3F) +
		encode6bit(c4 & 0x3F);
}

function encode6bit(b) {
	if (b < 10) return String.fromCharCode(48 + b);
	b -= 10;
	if (b < 26) return String.fromCharCode(65 + b);
	b -= 26;
	if (b < 26) return String.fromCharCode(97 + b);
	b -= 26;
	if (b === 0) return "-";
	if (b === 1) return "_";
	return "?";
}

function compress(s) {
	return encode64(pako.deflateRaw(s, { level: 9 }));
}

function getBackgroundColor(element, pseudoElt) {
	if (element !== null) {
		if (pseudoElt === undefined) pseudoElt = null;
		return window
			.getComputedStyle(element, pseudoElt)
			.getPropertyValue("background-color");
	}
	return "";
}

class CodePre {
	constructor(nodeList) {
		this.exist = false;
		this.list = nodeList;
		this.parentColor = "";
		this.selfColor = "";
		if (this.list.length > 0) {
			this.selfColor = getBackgroundColor(this.list.item(0));
			this.parentColor = getBackgroundColor(this.list.item(0).parentElement);
			this.exist = true;
		}
	}
}

const codePre = new CodePre(document.querySelectorAll(".markdown-body pre")); // github style

function changeBackgroundColor(element, color, exist) {
	if (exist) {
		element.style.backgroundColor = color;
	}
}

function replaceElement(umlElem, srcUrl) {
	const parent = umlElem.parentNode;
	if (parent !== null) { // for asciidoc (div div pre)
		const imgElem = document.createElement("img");
		imgElem.setAttribute("src", srcUrl);
		imgElem.setAttribute("title", "");
		parent.replaceChild(imgElem, umlElem);
		changeBackgroundColor(parent, codePre.parentColor, codePre.exist);

		imgElem.ondblclick = () => {
			parent.replaceChild(umlElem, imgElem);
			changeBackgroundColor(parent, codePre.selfColor, codePre.exist);
		};
		umlElem.ondblclick = () => {
			parent.replaceChild(imgElem, umlElem);
			changeBackgroundColor(parent, codePre.parentColor, codePre.exist);
		};
	}
}

const siteProfiles = {
	"default": {
		"selector": "pre[lang='uml'], pre[lang='puml'], pre[lang='plantuml']",
		"extract": (elem) => {
			return elem.querySelector("code").textContent.trim();
		},
		"replace": (elem) => {
			return elem;
		},
		"compress": (elem) => {
			return compress(elem.querySelector("code").textContent.trim());
		}
	},
	"gitlab.com": {
		"selector": "pre code span.line, div div pre", // markdown, asciidoc
		"extract": (elem) => {
			return elem.textContent.trim();
		},
		"replace": (elem) => {
			const child = elem.querySelector("code");
			if (child !== null) return child; // markdown
			return elem; // asciidoc
		},
		"compress": (elem) => {
			let plantuml = "";
			if (elem.tagName === "SPAN") { // markdown
				elem.parentNode.querySelectorAll("span.line").forEach((span) => {
					plantuml = plantuml + span.textContent.trim() + "\n";
				});
			} else { // asciidoc
				plantuml = elem.textContent.trim();
			}
			return compress(plantuml);
		}
	},
	"bitbucket.org": {
		"selector": "div.codehilite.language-plantuml > pre",
		"extract": (elem) => {
			return elem.innerText.trim();
		},
		"replace": (elem) => {
			return elem;
		},
		"compress": (elem) => {
			return compress(elem.innerText.trim());
		}
	},
	"backlog.jp": {
		"selector": "pre.lang-uml, pre.lang-puml, pre.lang-plantuml",
		"extract": (elem) => {
			return elem.innerText.trim();
		}
	},
	"cloudmine.jp": { // Lychee Redmine
		"selector": "pre > code[data-language='uml'], pre > code[data-language='puml'], pre > code[data-language='plantuml']",
		"extract": (elem) => {
			return elem.textContent.trim();
		},
		"replace": (elem) => {
			return elem;
		},
		"compress": (elem) => {
			return compress(elem.textContent.trim());
		}
	},
	"github.com": { // markdown + asciidoc
		"selector": "pre[lang='uml'], pre[lang='puml'], pre[lang='plantuml'], div div pre", // markdown, asciidoc
		"extract": (elem) => {
			const child = elem.querySelector("code");
			if (child !== null) return child.textContent.trim(); // markdown
			return elem.textContent.trim(); // asciidoc
		},
		"replace": (elem) => {
			const child = elem.querySelector("code");
			if (child !== null) return child; // markdown
			return elem; // asciidoc
		},
		"compress": (elem) => {
			let plantuml = "";
			const child = elem.querySelector("code");
			if (child !== null) { // markdown
				plantuml = child.textContent.trim();
			} else { // asciidoc
				plantuml = elem.textContent.trim();
			}
			return compress(plantuml);
		}
	}
};


function loop(counter, retry, siteProfile, baseUrl) {
	counter++;
	if (document.querySelector("i[aria-label='Loading content…']") === null) counter += retry;
	const id = setTimeout(loop, 100, counter, retry, siteProfile, baseUrl);
	if (counter >= retry) {
		clearTimeout(id);
		processElements(siteProfile, baseUrl);
	}
}

function processElements(siteProfile, baseUrl) {
	for (const umlElem of document.querySelectorAll(siteProfile.selector)) {
		const plantuml = siteProfile.extract(umlElem);
		if (!plantuml.startsWith("@start")) continue;
		const plantUmlServerUrl = baseUrl + siteProfile.compress(umlElem);
		const replaceElem = siteProfile.replace(umlElem);
		if (plantUmlServerUrl.startsWith("https")) {
			replaceElement(replaceElem, plantUmlServerUrl);
		} else {
			// to avoid mixed-content
			chrome.runtime.sendMessage({ "action": "plantuml", "url": plantUmlServerUrl }, (dataUri) => {
				replaceElement(replaceElem, dataUri);
			});
		}
	}
}

function run(config) {
	const hostname = window.location.hostname.split(".").slice(-2).join(".");
	const siteProfile = siteProfiles[hostname] || siteProfiles["default"];
	const baseUrl = config.baseUrl || "https://www.plantuml.com/plantuml/img/";
	if (document.querySelector("i[aria-label='Loading content…']") !== null) { // for wait loading @ gitlab.com
		loop(1, 10, siteProfile, baseUrl);
	}
	processElements(siteProfile, baseUrl);
}

chrome.storage.local.get("baseUrl", (config) => {
	if (window.location.hostname === "bitbucket.org") {
		const observer = new MutationObserver(() => {
			if (document.getElementsByClassName("language-plantuml").length > 0) {
				run(config);
				observer.disconnect();
			}
		});

		observer.observe(document.body, {
			attributes: true,
			characterData: true,
			childList: true,
			subtree: true
		});
	}

	run(config);
});
