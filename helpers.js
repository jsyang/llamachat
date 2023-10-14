export function getTokensForString(str) {
    return str.length;
}

export function formatMessage(msg) {
    return `${msg.role}: ${msg.content}`;
}

// Search around the middle for system messages to drop when chopping
const searchMiddleSequence = [0, 1, -1, 2, -2];

export function truncateMessages(messages, chopStrategy = 'middle') {
    switch (chopStrategy) {
        case 'middle':
            const index = messages.length >> 1;
            // Prefer to lose generated messages rather than user input
            const foundMessageToDrop = searchMiddleSequence.findIndex(offset => messages[offset + index].role === 'system');
            messages.splice(foundMessageToDrop || index, 1);
            break;
        case 'end':
            messages.pop();
            break;
        case 'start':
        default:
            messages.shift();
    }
    const allText = messages.map(formatMessage).join('\n');
    return { messages, tokenCount: getTokensForString(allText) };
}

export function chunkString(s, length) {

    const chunks = [];
    let i = 0;
    while (i < s.length) {
        chunks.push(s.substring(i, i + length));
        i += length;
    }

    return chunks;
}