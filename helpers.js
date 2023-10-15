export function getTokensForString(str) {
    return str.length;
}

export function formatMessage(msg) {
    return `${msg.role}: ${msg.content}`;
}

// Returns a number between 1 - 9
function getShannonEntropy(buf, start = 0, end) {
    let H = 0;
    end = end || buf.length;
    const onebycount = 1 / (end - start);
    const keys = [];
    const C = {};
    let val;

    for (let i = start; i < end; i++) {
        val = buf[i];
        if (typeof C[val] == 'undefined') {
            keys.push(val);
            C[val] = onebycount;
        } else {
            C[val] += onebycount;
        }
    }

    for (let i = 0; i < keys.length; i++) {
        H += C[keys[i]] * Math.log(C[keys[i]]);
    }

    return -H / Math.LN2 + 1;
}

const WEIGHTS_ROLE = {
    user: 1,
    system: 4,  // Prefer to lose system messages over user ones
};

const getPruneWeight = m => WEIGHTS_ROLE[m.role] / getShannonEntropy(m.content);
const sortByPruneWeightAscending = (a, b) => getPruneWeight(a) - getPruneWeight(b);


// Select this many elements before and after the truncation position to be candidates for the next truncation
const pruneRadius = 4;

// Drop messages to fit inside the context window
// Use a truncation location strategy and an entropy measure to figure out what to drop
export function truncateMessages(messages, chopStrategy = 'middle') {
    switch (chopStrategy) {
        case 'middle':
            const index = messages.length >> 1;
            const candidate = [
                ...messages.slice(index - pruneRadius, index),
                ...messages.slice(index, index + pruneRadius),
            ].sort(sortByPruneWeightAscending).pop();

            const dropped = messages.splice(messages.findIndex(m => m === candidate), 1)[0];
            console.log('[truncated]', JSON.stringify(dropped));

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

