export class MessageLog {
    constructor() {
        this.container = document.getElementById('message-log');
    }

    add(text, colorHex = 0xffffff) {
        if (!this.container) return;

        // Convert hex integer to CSS string (e.g., 0xff0000 -> #ff0000)
        const colorStr = '#' + colorHex.toString(16).padStart(6, '0');

        const msg = document.createElement('div');
        msg.className = 'log-msg';
        msg.innerText = text;
        msg.style.color = colorStr;
        // Add a slight drop shadow for readability
        msg.style.textShadow = `0 0 2px ${colorStr}`;

        this.container.appendChild(msg);

        // Auto remove after animation finishes (1s defined in CSS)
        setTimeout(() => {
            if (msg.parentNode) msg.parentNode.removeChild(msg);
        }, 1000); 
    }
}