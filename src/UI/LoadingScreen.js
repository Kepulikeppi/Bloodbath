export class LoadingScreen {
    constructor() {
        this.screen = document.getElementById('loading-screen');
        this.title = document.getElementById('loading-title');
        this.text = document.getElementById('loading-text');
        this.bar = document.getElementById('loading-bar');
    }

    setTitle(level) {
        if (this.title) this.title.innerText = "LEVEL " + level;
    }

    update(percent, message) {
        if (this.bar) this.bar.style.width = percent + "%";
        if (this.text) this.text.innerText = message;
    }

    complete() {
        this.update(100, "CLICK TO START");
    }

    hide() {
        if (this.screen) {
            this.screen.classList.add('fade-out');
            setTimeout(() => { 
                this.screen.style.display = 'none'; 
            }, 500);
        }
    }

    isVisible() {
        return this.screen && this.screen.style.display !== 'none';
    }
}