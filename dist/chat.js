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

const EVENTSTREAM_PREFIX = 'data: ';
const EVENTSTREAM_ENDED = '[DONE]';

async function submitChatMessage(e) {
    e.preventDefault();
    e.stopPropagation();
    const userInputEl = document.getElementById('user');
    const prompt = userInputEl.value;

    logMsg(prompt, 'user');
    logMsg('');

    try {
        userInputEl.setAttribute('disabled', 'disabled');

        const logEl = document.getElementById('log');

        // todo: externalize this logic for reuse
        const res = await fetch(API_URL.BASIC_CHAT, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/event-stream'
            },
            body: JSON.stringify({ messages: splitLargeMessages() })
        });

        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();

        while (true) {
            let { value, done } = await reader.read();
            let totalMsg = '';

            for (const l of value.split('\n')) {
                if (!l) continue; // empty lines
                if (l.indexOf(EVENTSTREAM_PREFIX) >= 0) {
                    const msgChunk = l.substring(EVENTSTREAM_PREFIX.length);

                    if (msgChunk === EVENTSTREAM_ENDED) {
                        done = true;
                    } else {
                        const { response } = JSON.parse(msgChunk);
                        totalMsg += response;
                    }
                }
            }

            if (done) break;

            logEl.lastChild.lastChild.innerHTML += totalMsg;
            scrollToBottom();
        }

        reader.cancel();
        userInputEl.value = '';
        userInputEl.removeAttribute('disabled');

        userInputEl.focus();
    } catch (e) {
        alert(e);
        console.trace(e);
        userInputEl.removeAttribute('disabled');
    }
}

function logMsg(content, role) {
    const logEl = document.getElementById('log');

    role = role || 'system';

    logEl.innerHTML += `<div class="${role ? role : 'system'}"><span>${content}</span></div>`;

    if (role) {
        messages.push({ role, content });
    }

    setTimeout(scrollToBottom, 1000);
}

function scrollToBottom() {
    const logEl = document.getElementById('log');

    logEl.scroll({
        top: 1e12,
        behavior: 'smooth'
    });
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

async function continueReply(e) {
    const originatingMsgEl = e.target.closest('.system');
    const msgIndex = Array.from(originatingMsgEl.parentElement.children).indexOf(originatingMsgEl);
    messages[msgIndex];

    document.body.classList.add('hide-more');

    const res = await fetch(
        API_URL.COMPLETION,
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