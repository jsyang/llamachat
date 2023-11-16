const messages = [];

const CHAT_API_URL = '/chat/image';

async function submitChatMessage(e) {
    e.preventDefault();
    e.stopPropagation();
    const userInputEl = document.getElementById('user');
    const prompt = userInputEl.value;

    logMsg(prompt, 'user');
    logMsg('<i>⏳ Generating the response, please wait...</i>');

    userInputEl.setAttribute('disabled', 'disabled');

    const res = await fetch(
        CHAT_API_URL,
        {
            method: 'post',
            'Content-Type': 'application/json',
            body: JSON.stringify({ prompt })
        }
    );

    const imageObjectURL = URL.createObjectURL(await res.blob());

    userInputEl.value = '';
    userInputEl.removeAttribute('disabled');
    deleteLastMsg();
    logMsg(imageObjectURL, 'system', true);

    userInputEl.focus();
}

function logMsg(content, role = 'system', isImage = false) {
    const logEl = document.getElementById('log');

    if (isImage) {
        content = `<img src="${content}">`;
    } else {
        content = `<span>${content}</span>`;
    }

    logEl.innerHTML += `<div class="${role ? role : 'system'}">${content}</div>`;

    if (role) {
        messages.push({ role, content });
    }

    setTimeout(scrollToBottom, 1000);
}

function scrollToBottom() {
    const logEl = document.getElementById('log');

    logEl.scroll({
        top: 1e8,
        behavior: 'smooth'
    });
}

function deleteLastMsg() {
    messages.pop();
    const logEl = document.getElementById('log');
    logEl.removeChild(logEl.lastChild);
}

async function blobToDataUrl(blob) {
    const e = await new Promise(r => {
        const a = new FileReader();
        a.onload = r;
        a.readAsDataURL(blob);
    });

    return e.target.result;
}

function saveConversation() {
    const now = new Date();
    const markdownConversation = `# Conversation @ ${now.toISOString()}\n\n` + messages.map(async m => {
        if (m.role === 'user') {
            return '### ' + m.content;
        } else {
            return `![generated image](${await blobToDataUrl(m.content)})`;
        }
    })
        .join('\n\n');

    const a = document.createElement('a');
    a.setAttribute('download', now.valueOf() + '.md');
    a.href = "data:text/markdown;base64," + btoa(markdownConversation);

    a.click();
}
