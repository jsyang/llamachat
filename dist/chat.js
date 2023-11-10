const messages = [];

function splitLargeMessages() {
    let outgoingMessages = [];
    for (const m of messages) {
        const splitContent = m.content.split('\n').filter(Boolean).map(
            content => ({ role: m.role, content })
        );

        outgoingMessages = [
            ...outgoingMessages,
            ...splitContent
        ];
    }

    return outgoingMessages;
}

let CHAT_API_URL;

async function submitChatMessage(e) {
    e.preventDefault();
    e.stopPropagation();
    const userInputEl = document.getElementById('user');
    const prompt = userInputEl.value;

    logMsg(prompt, 'user');
    logMsg('<i>LLM is generating the response, please wait...</i>');

    userInputEl.setAttribute('disabled', 'disabled');

    if (!CHAT_API_URL) {
        if (location.hostname === 'localhost') {
            // Local testing
            CHAT_API_URL = 'https://app.cohesive.workers.dev/chat/basic';
        } else {
            CHAT_API_URL = document.body.getAttribute('data-chat-url') || '/chat/basic';
        }
    }

    const res = await fetch(
        CHAT_API_URL,
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

    role = role || 'system';

    let moreTextButton = '';
    if (role === 'system') {
        moreTextButton = '<div class="more"><button onclick="continueReply(event)">more</button></div>';
    }

    logEl.innerHTML += `<div class="${role ? role : 'system'}"><span>${content}</span>${moreTextButton}</div>`;

    logEl.scroll({
        top: 1e8,
        behavior: 'smooth'
    });

    if (role) {
        messages.push({ role, content });
    }
}

function deleteLastMsg() {
    messages.pop();
    const logEl = document.getElementById('log');
    logEl.removeChild(logEl.lastChild);
}

function saveConversation() {
    const now = new Date();
    const markdownConversation = `# Conversation @ ${now.toISOString()}\n\n` + messages.map(m => {
        if (m.role === 'user') {
            return '### ' + m.content;
        } else {
            return m.content;
        }
    })
        .join('\n\n');

    const a = document.createElement('a');
    a.setAttribute('download', now.valueOf() + '.md');
    a.href = "data:text/markdown;base64," + btoa(markdownConversation);

    a.click();
}

let COMPLETION_API_URL;


async function continueReply(e) {
    const originatingMsgEl = e.target.closest('.system');
    const msgIndex = Array.from(originatingMsgEl.parentElement.children).indexOf(originatingMsgEl);
    messages[msgIndex];

    if (!COMPLETION_API_URL) {
        if (location.hostname === 'localhost') {
            // Local testing
            COMPLETION_API_URL = 'https://app.cohesive.workers.dev/chat/completion';
        } else {
            COMPLETION_API_URL = '/chat/completion';
        }
    }

    document.body.classList.add('hide-more');

    const res = await fetch(
        COMPLETION_API_URL,
        {
            method: 'post',
            'Content-Type': 'application/json',
            body: JSON.stringify({ prompt: messages[msgIndex].content })
        }
    );

    const { response } = await res.json();

    document.body.classList.remove('hide-more');

    messages[msgIndex].content += ' ' + response;

    originatingMsgEl.querySelector('span').innerHTML += ' ' + response;
}