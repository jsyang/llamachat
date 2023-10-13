export function getTokensForString(str) {
    return str.length;
}

const ROLE_ALIAS = {
    system: 'system',
    user: 'user',
};

export function formatMessage(msg) {
    return `${ROLE_ALIAS[msg.role]}: ${msg.content}`;
}

export function truncateMessages(messages) {
    messages.shift();
    const allText = messages.map(formatMessage).join('\n');
    return { messages, tokenCount: getTokensForString(allText) };
}