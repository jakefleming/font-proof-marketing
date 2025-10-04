// Interactive Glyph Bezier Editor with OpenType.js
class GlyphBezierEditor {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.font = null;
    this.glyph = null;
    this.glyphSize = 400; // Larger glyph
    this.showControlPoints = true;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.originalPath = null;
    this.editableCommands = [];
    this.isDragging = false;
    this.dragPoint = null;
    this.controlPointRadius = 8; // Larger control points
    this.canvasRect = null;
    this.init();
  }

  async init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  async setup() {
    this.canvas = document.getElementById('glyphEditorCanvas');
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.canvasRect = this.canvas.getBoundingClientRect();
    
    // Set up high DPI canvas
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvasRect.width * dpr;
    this.canvas.height = this.canvasRect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = this.canvasRect.width + 'px';
    this.canvas.style.height = this.canvasRect.height + 'px';

    // Calculate initial transform
    this.offsetX = this.canvasRect.width / 2;
    this.offsetY = this.canvasRect.height / 2;
    this.scale = this.glyphSize / 1000; // OpenType.js uses 1000 units per em

    // Load the font
    try {
      // Handle both local development and GitHub Pages
      // When running locally with baseurl, Jekyll serves at /font-proof-marketing/
      const basePath = window.location.pathname.includes('/font-proof-marketing') ? '/font-proof-marketing' : '';
      const fontPath = `${basePath}/assets/fonts/VCHenrietta-Medium.woff`;
      console.log('Loading font from:', fontPath);
      this.font = await opentype.load(fontPath);
      console.log('Font loaded successfully:', this.font);
      
      // Get the ampersand glyph
      this.glyph = this.font.charToGlyph('&');
      this.originalPath = this.glyph.path;
      this.parseGlyphPath();
      
      this.setupControls();
      this.setupEventListeners();
      this.render();
    } catch (error) {
      console.error('Failed to load font:', error);
      this.renderFallback();
    }
  }

  parseGlyphPath() {
    // Convert OpenType.js path commands to editable format
    this.editableCommands = [];
    const commands = this.originalPath.commands;
    
    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      const editableCmd = {
        type: cmd.type,
        x: cmd.x || 0,
        y: cmd.y || 0,
        originalX: cmd.x || 0,
        originalY: cmd.y || 0
      };
      
      if (cmd.x1 !== undefined) {
        editableCmd.x1 = cmd.x1;
        editableCmd.y1 = cmd.y1;
        editableCmd.originalX1 = cmd.x1;
        editableCmd.originalY1 = cmd.y1;
      }
      
      if (cmd.x2 !== undefined) {
        editableCmd.x2 = cmd.x2;
        editableCmd.y2 = cmd.y2;
        editableCmd.originalX2 = cmd.x2;
        editableCmd.originalY2 = cmd.y2;
      }
      
      this.editableCommands.push(editableCmd);
    }
  }

  setupControls() {
    const glyphSizeSlider = document.getElementById('glyphSize');
    const glyphSizeValue = document.getElementById('glyphSizeValue');
    const resetButton = document.getElementById('resetGlyph');
    const toggleControlsButton = document.getElementById('toggleControlPoints');

    if (glyphSizeSlider && glyphSizeValue) {
      glyphSizeSlider.addEventListener('input', (e) => {
        this.glyphSize = parseInt(e.target.value);
        this.scale = this.glyphSize / 1000;
        glyphSizeValue.textContent = this.glyphSize;
        this.render();
      });
    }

    if (resetButton) {
      resetButton.addEventListener('click', () => {
        this.resetGlyph();
      });
    }

    if (toggleControlsButton) {
      toggleControlsButton.addEventListener('click', () => {
        this.showControlPoints = !this.showControlPoints;
        toggleControlsButton.textContent = this.showControlPoints ? 'Hide Controls' : 'Show Controls';
        this.render();
      });
    }
  }

  setupEventListeners() {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));
  }

  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  transformPoint(x, y) {
    return {
      x: this.offsetX + (x * this.scale),
      y: this.offsetY - (y * this.scale) // Flip Y axis
    };
  }

  inverseTransformPoint(x, y) {
    return {
      x: (x - this.offsetX) / this.scale,
      y: -(y - this.offsetY) / this.scale // Flip Y axis back
    };
  }

  findControlPoint(mouseX, mouseY) {
    for (let i = 0; i < this.editableCommands.length; i++) {
      const cmd = this.editableCommands[i];
      
      // Check main point
      if (cmd.x !== undefined && cmd.y !== undefined) {
        const point = this.transformPoint(cmd.x, cmd.y);
        const distance = Math.sqrt(Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2));
        if (distance <= this.controlPointRadius) {
          return { cmdIndex: i, pointType: 'main' };
        }
      }
      
      // Check control point 1
      if (cmd.x1 !== undefined && cmd.y1 !== undefined) {
        const point = this.transformPoint(cmd.x1, cmd.y1);
        const distance = Math.sqrt(Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2));
        if (distance <= this.controlPointRadius) {
          return { cmdIndex: i, pointType: 'cp1' };
        }
      }
      
      // Check control point 2
      if (cmd.x2 !== undefined && cmd.y2 !== undefined) {
        const point = this.transformPoint(cmd.x2, cmd.y2);
        const distance = Math.sqrt(Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2));
        if (distance <= this.controlPointRadius) {
          return { cmdIndex: i, pointType: 'cp2' };
        }
      }
    }
    return null;
  }

  onMouseDown(e) {
    if (!this.showControlPoints) return;
    
    const mousePos = this.getMousePos(e);
    this.dragPoint = this.findControlPoint(mousePos.x, mousePos.y);
    
    if (this.dragPoint) {
      this.isDragging = true;
      this.canvas.style.cursor = 'grabbing';
    }
  }

  onMouseMove(e) {
    const mousePos = this.getMousePos(e);
    
    if (this.isDragging && this.dragPoint) {
      const worldPos = this.inverseTransformPoint(mousePos.x, mousePos.y);
      const cmd = this.editableCommands[this.dragPoint.cmdIndex];
      
      if (this.dragPoint.pointType === 'main') {
        cmd.x = worldPos.x;
        cmd.y = worldPos.y;
      } else if (this.dragPoint.pointType === 'cp1') {
        cmd.x1 = worldPos.x;
        cmd.y1 = worldPos.y;
      } else if (this.dragPoint.pointType === 'cp2') {
        cmd.x2 = worldPos.x;
        cmd.y2 = worldPos.y;
      }
      
      this.render();
    } else if (this.showControlPoints) {
      // Update cursor based on hover state
      const hoverPoint = this.findControlPoint(mousePos.x, mousePos.y);
      this.canvas.style.cursor = hoverPoint ? 'grab' : 'crosshair';
    }
  }

  onMouseUp(e) {
    this.isDragging = false;
    this.dragPoint = null;
    this.canvas.style.cursor = this.showControlPoints ? 'crosshair' : 'default';
  }

  resetGlyph() {
    // Reset all points to original positions
    for (let i = 0; i < this.editableCommands.length; i++) {
      const cmd = this.editableCommands[i];
      cmd.x = cmd.originalX;
      cmd.y = cmd.originalY;
      if (cmd.originalX1 !== undefined) {
        cmd.x1 = cmd.originalX1;
        cmd.y1 = cmd.originalY1;
      }
      if (cmd.originalX2 !== undefined) {
        cmd.x2 = cmd.originalX2;
        cmd.y2 = cmd.originalY2;
      }
    }
    this.render();
  }

  render() {
    const ctx = this.ctx;
    const rect = this.canvasRect;
    
    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // Draw the glyph outline
    this.drawGlyph();
    
    // Draw control points if enabled
    if (this.showControlPoints) {
      this.drawControlPoints();
    }
  }

  drawGrid() {
    const ctx = this.ctx;
    const rect = this.canvasRect;
    
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    
    const gridSize = 20;
    for (let x = 0; x < rect.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
      ctx.stroke();
    }
    
    for (let y = 0; y < rect.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }
    
    ctx.setLineDash([]);
  }

  drawGlyph() {
    const ctx = this.ctx;
    
    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, -this.scale); // Flip Y axis
    
    ctx.beginPath();
    
    for (let i = 0; i < this.editableCommands.length; i++) {
      const cmd = this.editableCommands[i];
      
      switch (cmd.type) {
        case 'M':
          ctx.moveTo(cmd.x, cmd.y);
          break;
        case 'L':
          ctx.lineTo(cmd.x, cmd.y);
          break;
        case 'C':
          ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
          break;
        case 'Q':
          ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
          break;
        case 'Z':
          ctx.closePath();
          break;
      }
    }
    
    ctx.restore();
    
    // Style the glyph - black fill
    ctx.fillStyle = '#000000';
    ctx.fill();
  }

  drawControlPoints() {
    const ctx = this.ctx;
    
    for (let i = 0; i < this.editableCommands.length; i++) {
      const cmd = this.editableCommands[i];
      
      // Draw main point
      if (cmd.x !== undefined && cmd.y !== undefined) {
        const point = this.transformPoint(cmd.x, cmd.y);
        this.drawControlPoint(point.x, point.y, '#dc2626', true);
      }
      
      // Draw control points and lines
      if (cmd.x1 !== undefined && cmd.y1 !== undefined) {
        const cp1 = this.transformPoint(cmd.x1, cmd.y1);
        const main = this.transformPoint(cmd.x, cmd.y);
        
        // Draw control line
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(cp1.x, cp1.y);
        ctx.lineTo(main.x, main.y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw control point
        this.drawControlPoint(cp1.x, cp1.y, '#16a34a', false);
      }
      
      if (cmd.x2 !== undefined && cmd.y2 !== undefined) {
        const cp2 = this.transformPoint(cmd.x2, cmd.y2);
        const main = this.transformPoint(cmd.x, cmd.y);
        
        // Draw control line
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(cp2.x, cp2.y);
        ctx.lineTo(main.x, main.y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw control point
        this.drawControlPoint(cp2.x, cp2.y, '#ea580c', false);
      }
    }
  }

  drawControlPoint(x, y, color, isMainPoint) {
    const ctx = this.ctx;
    
    ctx.fillStyle = color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    if (isMainPoint) {
      // Square for main points
      const size = this.controlPointRadius;
      ctx.rect(x - size, y - size, size * 2, size * 2);
    } else {
      // Circle for control points
      ctx.arc(x, y, this.controlPointRadius, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
  }

  renderFallback() {
    const ctx = this.ctx;
    const rect = this.canvasRect;
    
    ctx.fillStyle = '#64748b';
    ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Font failed to load', rect.width / 2, rect.height / 2 - 10);
    ctx.fillText('Check console for details', rect.width / 2, rect.height / 2 + 10);
  }
}

// Initialize the glyph editor
const glyphEditor = new GlyphBezierEditor();