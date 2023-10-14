const $ = id => document.getElementById(id);

async function submitURL(e) {
    e.preventDefault();
    e.stopPropagation();

    const $user = $('user');
    const $log = $('log');

    const res = await fetch('/process-url', { method: 'post', body: $user.value });
    // const text = JSON.stringify(await res.json());
    const text = await res.text();

    $log.innerHTML = text;
}

async function submitText(e) {
    e.preventDefault();
    e.stopPropagation();

    const $log = $('log');

    const res = await fetch('/notes', { method: 'post', body: $log.value });
    const text = JSON.stringify(await res.json());
    // const text = await res.text();

    console.log(text);
}