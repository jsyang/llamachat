const messages = [];

async function submitPrompt(e) {
    e.preventDefault();
    e.stopPropagation();
    const userInputEl = document.getElementById('user');
    const prompt = userInputEl.value;

    logMsg(prompt, 'user');
    logMsg('<i>LLM is generating the response, please wait...</i>');

    userInputEl.setAttribute('disabled', 'disabled');
    const res = await fetch('/chat', { method: 'post', 'Content-Type': 'application/json', body: JSON.stringify({ prompt }) });

    const { response } = await res.json();
    userInputEl.value = '';
    userInputEl.removeAttribute('disabled');
    deleteLastMsg();
    logMsg(response, 'system');

    userInputEl.focus();
}

function logMsg(content, role) {
    const logEl = document.getElementById('log');

    logEl.innerHTML += `<div class="${role ? role : 'system'}"><span>${content}</span></div>`;

    logEl.scroll({
        top: 1e8,
        behavior: 'smooth'
    });

    if (role) {
        messages.push({ role, content });
    }
}

function deleteLastMsg() {
    const logEl = document.getElementById('log');
    logEl.removeChild(logEl.lastChild);
}