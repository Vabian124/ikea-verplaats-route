document.getElementById('timeMargin').addEventListener('input', updateMargin);

function updateMargin() {
    timeMargin = parseInt(document.getElementById('timeMargin').value);
}
