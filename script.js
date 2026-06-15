// --- 1. Semantic DOM Neural Network Canvas ---
const canvas = document.getElementById('dom-network-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let virtualNodeLayers = []; 
let networkConnections = []; 

function initCanvas() {
    width = window.innerWidth;
    height = window.innerHeight; // Canvas buffer must match viewport height since it is position:fixed
    
    canvas.width = width;
    canvas.height = height;
    
    // 1. Group HTML boxes by data-layer attribute
    const boxElements = document.querySelectorAll('.network-box');
    const layerMap = {};
    
    Array.from(boxElements).forEach(box => {
        const layerIdx = parseInt(box.getAttribute('data-layer'));
        if (!layerMap[layerIdx]) layerMap[layerIdx] = [];
        
        const rect = box.getBoundingClientRect();
        layerMap[layerIdx].push({
            el: box,
            top: rect.top + window.scrollY,
            bottom: rect.bottom + window.scrollY,
            left: rect.left,
            right: rect.right
        });
    });
    
    const maxLayer = Math.max(...Object.keys(layerMap).map(Number));
    cloudBoxes = [];
    for (let i = 0; i <= maxLayer; i++) {
        if (layerMap[i]) {
            const boxes = layerMap[i];
            const minTop = Math.min(...boxes.map(b => b.top)) - 20; 
            const maxBottom = Math.max(...boxes.map(b => b.bottom)) + 20;
            
            cloudBoxes.push({
                layerElements: boxes.map(b => b.el),
                top: minTop,
                bottom: maxBottom
            });
        }
    }
    
    // 2. Generate Virtual Node Layers (Alternating 4 and 3 nodes)
    virtualNodeLayers = [];
    const numNodeLayers = cloudBoxes.length + 1;
    
    for (let i = 0; i < numNodeLayers; i++) {
        let yPos;
        if (i === 0) {
            yPos = cloudBoxes[0].top - 150;
        } else if (i === numNodeLayers - 1) {
            yPos = cloudBoxes[cloudBoxes.length - 1].bottom + 150;
        } else {
            yPos = (cloudBoxes[i - 1].bottom + cloudBoxes[i].top) / 2;
        }
        
        // Use custom layer topology with max 5 nodes to avoid consecutive identical counts
        const nodeCounts = [2, 4, 3, 5, 2, 4, 3, 5, 2, 4, 2];
        const count = nodeCounts[i % nodeCounts.length];
        let nodes = [];
        const center = width / 2;
        
        // Define a constant distance between adjacent nodes to keep the grid perfectly aligned
        const maxNodes = 5;
        const maxSpan = width * 0.75; // Max span for 5 nodes
        const nodeSpacing = maxSpan / (maxNodes - 1);
        
        // Center the nodes based on their count
        const startX = center - ((count - 1) * nodeSpacing) / 2;
        
        for (let j = 0; j < count; j++) {
            let label = '';
            if (i === 0) {
                label = `x${j + 1}`;
            } else if (i === numNodeLayers - 1) {
                label = `y${j + 1}`;
            } else {
                label = `h${i}_${j + 1}`;
            }
            nodes.push({ x: startX + j * nodeSpacing, y: yPos, label: label });
        }
        
        virtualNodeLayers.push(nodes);
    }
    
    // 3. Pre-calculate true Node-to-Node dense weights
    networkConnections = [];
    
    // For each layer of nodes, connect fully to the next layer of nodes.
    // The HTML boxes will physically sit on top of these lines, hiding the parts that pass "through" them.
    for (let i = 0; i < virtualNodeLayers.length - 1; i++) {
        const topNodes = virtualNodeLayers[i];
        const bottomNodes = virtualNodeLayers[i + 1];
        
        topNodes.forEach((topNode) => {
            bottomNodes.forEach((bottomNode) => {
                networkConnections.push({
                    startX: topNode.x, startY: topNode.y,
                    endX: bottomNode.x, endY: bottomNode.y
                });
            });
        });
    }
}

function drawNetwork() {
    ctx.clearRect(0, 0, width, height);
    
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    const activationFront = scrollY + (window.innerHeight * 0.75); // Illuminates 75% down the screen
    
    ctx.save();
    ctx.translate(0, -scrollY);
    
    networkConnections.forEach(conn => {
        let isFullyActive = activationFront > conn.endY;
        let isPartiallyActive = activationFront > conn.startY && activationFront <= conn.endY;
        
        // Faint dormant line
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.moveTo(conn.startX, conn.startY);
        ctx.lineTo(conn.endX, conn.endY);
        ctx.stroke();
        
        // Bright glowing active line
        if (isFullyActive || isPartiallyActive) {
            ctx.beginPath();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.moveTo(conn.startX, conn.startY);
            
            if (isPartiallyActive) {
                const percent = (activationFront - conn.startY) / (conn.endY - conn.startY);
                const currentX = conn.startX + (conn.endX - conn.startX) * percent;
                const currentY = conn.startY + (conn.endY - conn.startY) * percent;
                ctx.lineTo(currentX, currentY);
            } else {
                ctx.lineTo(conn.endX, conn.endY);
            }
            
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    });
    
    // Draw Nodes
    virtualNodeLayers.forEach(layer => {
        layer.forEach(node => {
            ctx.beginPath();
            
            if (activationFront > node.y) {
                // Active node
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#ffffff';
            } else {
                // Dormant node
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 2;
                ctx.shadowBlur = 0;
            }
            
            ctx.fillStyle = '#111111'; // Match background
            ctx.arc(node.x, node.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            // Draw dummy variables
            ctx.font = '12px "Space Grotesk", monospace';
            ctx.fillStyle = (activationFront > node.y) ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.3)';
            ctx.textAlign = 'center';
            ctx.fillText(node.label, node.x, node.y - 15);
        });
        
        // Draw horizontal dotted line connecting all nodes in this layer
        if (layer.length > 1) {
            ctx.beginPath();
            ctx.setLineDash([4, 6]); // Dotted line pattern
            ctx.lineWidth = 1.5;
            if (activationFront > layer[0].y) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            } else {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            }
            ctx.moveTo(layer[0].x, layer[0].y);
            ctx.lineTo(layer[layer.length - 1].x, layer[0].y);
            ctx.stroke();
            ctx.setLineDash([]); // Reset line dash for next drawings
        }
    });
    
    // Progressive Box Border Activation matching the lines
    cloudBoxes.forEach(cloud => {
        let progress = 0;
        if (activationFront <= cloud.top) {
            progress = 0;
        } else if (activationFront >= cloud.bottom) {
            progress = 100;
        } else {
            progress = ((activationFront - cloud.top) / (cloud.bottom - cloud.top)) * 100;
        }
        
        cloud.layerElements.forEach(el => {
            el.style.setProperty('--progress', `${progress}%`);
        });
    });
    
    ctx.restore();
    requestAnimationFrame(drawNetwork);
}

window.addEventListener('load', () => {
    initCanvas();
    drawNetwork();
});

window.addEventListener('resize', () => {
    initCanvas();
});

// --- 3. Interactive Project Modals ---
const projectData = {
    'clv': {
        layer: 'Hidden Layer 2_',
        title: 'CLV Intelligence Engine',
        tech: ['LightGBM', 'Optuna', 'Streamlit'],
        body: '<p>Engineered a stacked machine learning ensemble combining LightGBM with statistical BG/NBD probabilistic models, cutting <strong>Mean Absolute Error by 43.6%</strong> on 775K+ transactions.</p><p>Built a causal-inference T-Learner uplift model identifying 424 persuadable customers, enabling ROI-maximizing allocation of an <strong>INR 50L</strong> quarterly retention budget.</p><p>Served forecasts via a production Streamlit MLOps dashboard featuring 85.6%-coverage conformal prediction intervals and automated PSI drift monitoring.</p>',
        github: 'https://github.com/Harsha081459/clv-intelligence-engine',
        demo: 'https://clv-intelligence-engine-d7mfl8tlmmw4nfdw52nquk.streamlit.app/'
    },
    'transformer': {
        layer: 'Hidden Layer 2_',
        title: 'Transformer QA System',
        tech: ['PyTorch', 'Hugging Face', 'FastAPI'],
        body: '<p>Architected and trained a 12-layer, 768-dim custom Transformer encoder (~110M params) completely from scratch via GPU-accelerated Masked Language Modeling on Wikipedia.</p><p>Fine-tuned on 130K+ SQuAD v2 QA pairs, achieving <strong>58.2 F1 (Extractive)</strong> and <strong>39.9 F1 (Generative)</strong>, outperforming from-scratch DistilBERT and T5-small baselines trained under identical conditions.</p><p>Deployed an end-to-end inference pipeline as a containerized REST API, serving FP16-quantized models optimized for CPU inference.</p>',
        github: 'https://github.com/Harsha081459/Question-Answer-System-with-a-Custom-Transformer-Encoder-and-Generative-Decoder',
        demo: 'https://huggingface.co/spaces/hv-123/QA-Engine'
    },
    'cv': {
        layer: 'Hidden Layer 3_',
        title: 'Traffic Violation CV',
        tech: ['YOLOv11', 'ONNX Runtime', 'FastAPI'],
        body: '<p>Built an end-to-end two-wheeler violation detection system—detecting no-helmet riders, overloaded bikes, and reading license plates—using a 3-stage YOLOv11 cascade.</p><p>Trained 3 specialized models on 17,670 curated images on a remote RTX 4060 Ti GPU, achieving mAP50 of <strong>0.936 (plate)</strong>, <strong>0.829 (helmet)</strong>, and 0.761 (motorcycle).</p><p>Accelerated CPU inference 1.8x via ONNX Runtime and deployed full-stack publicly on Hugging Face Spaces.</p>',
        github: 'https://github.com/Harsha081459/Traffic-Rule-Violation-Detection-for-Two-Wheelers',
        demo: 'https://hv-123-traffic-sentinel-ai.hf.space'
    },
    'drone': {
        layer: 'Hidden Layer 3_',
        title: 'Multimodal RL Drone',
        tech: ['PPO', 'Vision Transformers'],
        body: '<p>An advanced Reinforcement Learning simulation using Proximal Policy Optimization (PPO) to train an autonomous quadcopter agent.</p><p>The agent leverages Vision Transformers for spatial awareness, successfully learning to navigate complex environments. The final trained policy achieved a <strong>100% success rate</strong> during zero-shot generalization testing on unseen maps.</p>',
        github: 'https://github.com/Harsha081459',
        demo: '#'
    }
};

const modalOverlay = document.getElementById('project-modal-overlay');
const modalClose = document.getElementById('modal-close');
const modalTitle = document.getElementById('modal-title');
const modalLayer = document.getElementById('modal-layer');
const modalTech = document.getElementById('modal-tech-stack');
const modalBody = document.getElementById('modal-body');
const modalCode = document.getElementById('modal-link-code');
const modalDemo = document.getElementById('modal-link-demo');

document.querySelectorAll('.clickable-box').forEach(box => {
    box.addEventListener('click', () => {
        const id = box.getAttribute('data-project-id');
        const data = projectData[id];
        if (data) {
            modalLayer.textContent = data.layer;
            modalTitle.textContent = data.title;
            modalTech.innerHTML = data.tech.map(t => `<span>${t}</span>`).join('');
            modalBody.innerHTML = data.body;
            modalCode.href = data.github;
            if (data.demo && data.demo !== '#') {
                modalDemo.href = data.demo;
                modalDemo.style.display = 'inline-block';
            } else {
                modalDemo.style.display = 'none';
            }
            modalOverlay.classList.remove('hidden');
        }
    });
});

modalClose.addEventListener('click', () => {
    modalOverlay.classList.add('hidden');
});

modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        modalOverlay.classList.add('hidden');
    }
});

// --- 4. Scroll Navigation Bar ---
const scrollNav = document.createElement('div');
scrollNav.id = 'scroll-nav';
scrollNav.className = 'scroll-nav';
document.body.appendChild(scrollNav);

const rowElements = document.querySelectorAll('.story-timeline > div');
const navDashes = [];

const layerNames = [
    'Profile',
    'Metrics',
    'Overview',
    'Projects Intro',
    'Projects I',
    'Projects II',
    'Experience Intro',
    'NLP Research',
    'Achievements Intro',
    'Achievements',
    'Output Phase'
];

rowElements.forEach((row, index) => {
    const dashContainer = document.createElement('div');
    dashContainer.className = 'scroll-dash-container';
    dashContainer.addEventListener('click', () => {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    
    const label = document.createElement('span');
    label.className = 'scroll-dash-label';
    label.textContent = layerNames[index] || `Layer ${index}`;
    
    const dash = document.createElement('div');
    dash.className = 'scroll-dash';
    
    dashContainer.appendChild(label);
    dashContainer.appendChild(dash);
    
    scrollNav.appendChild(dashContainer);
    navDashes.push({ container: dashContainer, dash: dash, row: row });
});

window.addEventListener('scroll', () => {
    const viewportCenter = window.scrollY + window.innerHeight / 2;
    let minDistance = Infinity;
    let activeIndex = -1;
    
    navDashes.forEach((item, index) => {
        const rect = item.row.getBoundingClientRect();
        const rowCenter = rect.top + window.scrollY + rect.height / 2;
        const distance = Math.abs(viewportCenter - rowCenter);
        if (distance < minDistance) {
            minDistance = distance;
            activeIndex = index;
        }
    });
    
    navDashes.forEach((item, index) => {
        if (index === activeIndex) {
            item.container.classList.add('active');
            item.dash.classList.add('active');
        } else {
            item.container.classList.remove('active');
            item.dash.classList.remove('active');
        }
    });
});
// Trigger once to set initial state
window.dispatchEvent(new Event('scroll'));
