export function getTokensForString(str) {
    return str.length * 3;
}

const ROLE_ALIAS = {
    system:  'sys',
    user:  'usr',
};

export function formatMessage(msg) {
    return `${ROLE_ALIAS[msg.role]}: ${msg.content}`;
}