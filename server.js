const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Configuració de multer per pujar imatges
const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        const nomCientific = req.body.nom_cientific;
        const tipus = req.body.type;
        const dir = path.join('assets', 'imatges');
        
        // Assegura que el directori existeix
        await fs.mkdir(dir, { recursive: true });
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const nomCientific = req.body.nom_cientific;
        const tipus = req.body.type;
        const ext = path.extname(file.originalname);
        
        // Troba el següent número disponible
        findNextNumber(nomCientific, tipus, (num) => {
            const filename = `${nomCientific}_${String(num).padStart(2, '0')}_${tipus}${ext}`;
            cb(null, filename);
        });
    }
});

const upload = multer({ storage: storage });

// Funció per trobar el següent número disponible
async function findNextNumber(nomCientific, tipus, callback) {
    const dir = path.join('assets', 'imatges');
    let num = 0;
    
    try {
        const files = await fs.readdir(dir);
        const pattern = new RegExp(`^${nomCientific}_\\d{2}_${tipus}\\.(jpg|png|jpeg)$`);
        
        files.forEach(file => {
            if (pattern.test(file)) {
                const match = file.match(/_(\d{2})_/);
                if (match) {
                    const fileNum = parseInt(match[1]);
                    if (fileNum >= num) {
                        num = fileNum + 1;
                    }
                }
            }
        });
    } catch (err) {
        console.error('Error llegint directori:', err);
    }
    
    callback(num);
}

// ENDPOINTS

// 1. Pujar imatge
app.post('/api/upload-image.php', upload.single('image'), async (req, res) => {
    try {
        res.json({ 
            success: true, 
            filename: req.file.filename,
            message: 'Imatge pujada correctament'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Eliminar imatges
app.post('/api/delete-images.php', async (req, res) => {
    try {
        const { files } = req.body;
        const dir = path.join('assets', 'imatges');
        
        for (const filename of files) {
            const filepath = path.join(dir, filename);
            try {
                await fs.unlink(filepath);
                console.log(`Eliminat: ${filename}`);
            } catch (err) {
                console.error(`Error eliminant ${filename}:`, err);
            }
        }
        
        res.json({ success: true, message: 'Imatges eliminades' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. Renombrar imatges (canviar tipus)
app.post('/api/rename-images.php', async (req, res) => {
    try {
        const { images } = req.body;
        const dir = path.join('assets', 'imatges');
        
        for (const img of images) {
            const oldPath = path.join(dir, img.oldName);
            const newPath = path.join(dir, img.newName);
            
            try {
                await fs.rename(oldPath, newPath);
                console.log(`Renombrat: ${img.oldName} -> ${img.newName}`);
            } catch (err) {
                console.error(`Error renombrant ${img.oldName}:`, err);
            }
        }
        
        res.json({ success: true, message: 'Imatges renombrades' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. Guardar el JSON de plantes
app.post('/api/save-plantes.php', async (req, res) => {
    try {
        const data = req.body;
        await fs.writeFile('plantes.json', JSON.stringify(data, null, 2));
        res.json({ success: true, message: 'Dades guardades' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Inicia el servidor
app.listen(PORT, () => {
    console.log(`
    🌿 Servidor de la Galeria Botànica iniciat!
    
    📍 Obre el navegador a: http://localhost:${PORT}/galeria-botanica-app.html
    
    ✅ Funcionalitats disponibles:
       - Pujar imatges noves
       - Eliminar imatges
       - Renombrar imatges (canviar tipus)
       - Guardar dades al JSON
    
    ⏹️  Prem Ctrl+C per aturar el servidor
    `);
    
    // Obre el navegador automàticament
    const url = `http://localhost:${PORT}/galeria-botanica-app.html`;
    
    // Detecta el sistema operatiu i obre el navegador
    const platform = process.platform;
    
    // Espera 1 segon abans d'obrir el navegador
    setTimeout(() => {
        if (platform === 'win32') {
            exec(`start ${url}`);
        } else if (platform === 'darwin') {
            exec(`open ${url}`);
        } else {
            exec(`xdg-open ${url}`);
        }
        
        console.log('\n    🌐 Obrint navegador...\n');
    }, 1000);
});