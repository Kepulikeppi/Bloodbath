import { state } from '../Game/GameState.js';
import { TechTreeConfig } from '../TechTreeConfig.js';
import { UIConfig } from '../UIConfig.js';

export class TechTreeUI {
    constructor(onLaunchNext) {
        this.overlay = document.getElementById('techtree-overlay');
        this.grid = document.getElementById('tech-grid');
        this.xpDisplay = document.getElementById('tech-xp-val');
        this.scrapDisplay = document.getElementById('tech-scrap-val');
        
        this.nameDisplay = document.getElementById('tech-name-display');
        this.descDisplay = document.getElementById('tech-desc-display');
        this.btnLaunch = document.getElementById('btn-launch-next');
        
        // Initialize Static Text from Config
        const setTxt = (id, txt) => {
            const el = document.getElementById(id);
            if (el) el.innerText = txt;
        };
        setTxt('tt-title', UIConfig.TECH.TITLE);
        setTxt('lbl-tt-xp', UIConfig.HUD.LABEL_XP);
        setTxt('lbl-tt-scrap', UIConfig.HUD.LABEL_SCRAP);
        setTxt('btn-launch-next', UIConfig.TECH.BTN_NEXT_LEVEL);
        
        // Set default description
        this.resetDescription();

        // Bind Launch Action
        this.btnLaunch.addEventListener('click', () => {
            if (onLaunchNext) onLaunchNext();
        });
    }

    resetDescription() {
        this.nameDisplay.innerText = UIConfig.TECH.SELECT_PROMPT;
        this.descDisplay.innerText = UIConfig.TECH.SELECT_DESC;
    }

    show() {
        this.overlay.style.display = 'flex';
        this.render();
    }

    hide() {
        this.overlay.style.display = 'none';
    }

    render() {
        // Update Currency
        this.xpDisplay.innerText = state.data.xp;
        this.scrapDisplay.innerText = state.data.materials.metal; 

        this.grid.innerHTML = '';

        // Iterate all config entries
        for (const [id, tech] of Object.entries(TechTreeConfig)) {
            const node = document.createElement('div');
            node.className = 'tech-node';
            
            // Check status
            const isOwned = state.data.unlockedTech.includes(id);
            const canAfford = state.data.xp >= tech.cost;
            
            // Check prerequisites
            let reqMet = true;
            if (tech.req) {
                for (const r of tech.req) {
                    if (!state.data.unlockedTech.includes(r)) reqMet = false;
                }
            }

            if (isOwned) {
                node.classList.add('owned');
                node.innerHTML = `<div class="node-name">${tech.name}</div><div class="node-cost">${UIConfig.TECH.STATUS_INSTALLED}</div>`;
            } else if (reqMet) {
                if (canAfford) node.classList.add('available');
                else node.classList.add('locked'); 
                
                node.innerHTML = `<div class="node-name">${tech.name}</div><div class="node-cost">${tech.cost} XP</div>`;
                
                if (canAfford) {
                    node.addEventListener('click', () => {
                        if (state.purchaseTech(id)) {
                            this.render(); // Refresh UI
                        }
                    });
                }

            } else {
                node.classList.add('locked');
                node.innerHTML = `<div class="node-name">${UIConfig.TECH.STATUS_LOCKED}</div><div class="node-cost">REQ: ${tech.req.join(', ')}</div>`;
            }

            // Hover for Description
            node.addEventListener('mouseenter', () => {
                this.nameDisplay.innerText = tech.name;
                this.descDisplay.innerText = tech.description;
            });
            node.addEventListener('mouseleave', () => {
                this.resetDescription();
            });

            this.grid.appendChild(node);
        }
    }
}