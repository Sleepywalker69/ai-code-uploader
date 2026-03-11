document.getElementById('zipUpload').addEventListener('change', async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const statusElement = document.getElementById('status');
    statusElement.innerText = "Extracting ZIP locally...";
    statusElement.style.color = "#2ea043";

    try {
        const zip = new JSZip();
        const contents = await zip.loadAsync(file);
        let combinedText = `// Extracted Repository: ${file.name}\n\n`;
        
        // Intelligent file filtering: skip images and binaries
        for (const [relativePath, zipEntry] of Object.entries(contents.files)) {
            if (!zipEntry.dir && !relativePath.match(/\.(png|jpg|jpeg|gif|ico|mp4|webm|pdf|zip|lock)$/i)) {
                const text = await zipEntry.async("string");
                combinedText += `\n--- File: ${relativePath} ---\n`;
                combinedText += text + `\n\n`;
            }
        }

        statusElement.innerText = "Injecting into chat...";

        // Inject into the active Chrome tab
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: injectTextIntoChat,
            args: [combinedText]
        });

        statusElement.innerText = "Success! Code injected.";

    } catch (error) {
        statusElement.innerText = "Error: " + error.message;
        statusElement.style.color = "red";
    }
});

// This function runs secretly inside the actual webpage (Claude/Gemini/ChatGPT)
function injectTextIntoChat(textToInject) {
    // Look for common AI chat textboxes
    let chatInput = document.querySelector('div[contenteditable="true"]') || 
                    document.querySelector('textarea#prompt-textarea') || 
                    document.querySelector('rich-textarea') ||
                    document.querySelector('textarea'); 

    if (chatInput) {
        // Insert the text depending on the type of text box
        if (chatInput.tagName === 'TEXTAREA' || chatInput.tagName === 'RICH-TEXTAREA') {
            chatInput.value = textToInject;
        } else if (chatInput.isContentEditable) {
            chatInput.innerText = textToInject;
        }
        // Force the website to recognize the new text
        chatInput.dispatchEvent(new Event('input', { bubbles: true }));
        alert("Code successfully loaded! You can now send your prompt.");
    } else {
        alert("Could not find the chat box. Please click into it first!");
    }
}