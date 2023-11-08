async function submitMsg(e) {
    e.preventDefault();
    e.stopPropagation();
    const text = document.getElementById('text').value;
    const to = document.getElementById('to').value;

    const res = await fetch(
        document.body.getAttribute('data-api-url') || '/chat/wa',
        {
            method: 'post',
            'Content-Type': 'application/json',
            body: JSON.stringify({ text, to, })
        }
    );

    document.getElementById('log').value += await res.text() + '\n\n';

    document.getElementById('text').value = '';
}