const saveOptions = () => {
	const baseUrl = document.getElementById("base_url").value;
	chrome.storage.local.set({ baseUrl }, () => {
		const status = document.getElementById("status");
		status.textContent = "Options saved.";
		setTimeout(() => {
			status.textContent = "";
		}, 750);
	});
};

const restoreOptions = () => {
	chrome.storage.local.get({
		baseUrl: "https://www.plantuml.com/plantuml/img/"
	}, (items) => {
		document.getElementById("base_url").value = items.baseUrl;
	});
};

document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("save").addEventListener("click", saveOptions);
