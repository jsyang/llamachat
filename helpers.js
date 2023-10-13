export function getTokensForString(str) {
    return str.length * 3.5;
}

const ROLE_ALIAS = {
    system:  'sys',
    user:  'usr',
};

export function formatMessage(msg) {
    return `${ROLE_ALIAS[msg.role]}: ${msg.content}`;
}