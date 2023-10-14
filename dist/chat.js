const messages = [];

function splitLargeMessages() {
    let outgoingMessages = [];
    for(const m of messages) {
        const splitContent = m.content.split('\n').filter(Boolean).map(
            content => ({role: m.role, content})
        );

        outgoingMessages = [
            ...outgoingMessages,
            ...splitContent
        ];
    }

    return outgoingMessages;
}

async function submitPrompt(e) {
    e.preventDefault();
    e.stopPropagation();
    const userInputEl = document.getElementById('user');
    const prompt = userInputEl.value;

    logMsg(prompt, 'user');
    logMsg('<i>LLM is generating the response, please wait...</i>');

    userInputEl.setAttribute('disabled', 'disabled');
    const res = await fetch(
        document.body.getAttribute('data-chat-url') || '/chat', 
        { 
            method: 'post', 
            'Content-Type': 'application/json', 
            body: JSON.stringify({ messages: splitLargeMessages() }) 
        }
    );

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
