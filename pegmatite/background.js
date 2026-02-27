async function fetchImageDataUri(uri) {
	const response = await fetch(uri);
	const arrayBuffer = await response.arrayBuffer();
	const contentType = response.headers.get("Content-Type");
	const bytes = new Uint8Array(arrayBuffer);
	const chunks = [];
	for (let i = 0; i < bytes.byteLength; i += 8192) {
		chunks.push(String.fromCharCode.apply(null, bytes.subarray(i, i + 8192)));
	}
	return "data:" + contentType + ";base64," + btoa(chunks.join(""));
}

function isAllowedUrl(url) {
	try {
		const parsed = new URL(url);
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action === "plantuml" && isAllowedUrl(message.url)) {
		fetchImageDataUri(message.url).then(sendResponse);
		return true; // keep message channel open for async response
	}
});

const matches = new RegExp(
	"^" + chrome.runtime.getManifest()
		.content_scripts[0].matches
		.join("|^")
		.replace(/\//g, "\\/")
		.replace(/\./g, "\\.")
		.replace(/\*/g, ".+"));

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	if (changeInfo.status === "complete" && tab.url?.match(matches)) {
		try {
			await chrome.scripting.executeScript({
				target: { tabId },
				files: ["pako_deflate.min.js", "content-script.js"]
			});
		} catch {
			// Ignore errors for restricted pages
		}
	}
});
