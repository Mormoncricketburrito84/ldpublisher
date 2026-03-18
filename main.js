const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');

let steamworks = null;
let steamClient = null;
let currentSteamCmdProcess = null;

const getLDPBasePath = () => {
    const p = path.join(app.getPath('documents'), 'LDPUBLISHER');
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    return p;
};

const getLogsPath = () => {
    const p = path.join(getLDPBasePath(), 'Hata_Kayitlari');
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    return p;
};

function logError(category, context, err) {
    try {
        const logFile = path.join(getLogsPath(), `${category}.txt`);
        const timestamp = new Date().toLocaleString('tr-TR');
        const msg = typeof err === 'object' ? (err.stack || err.message || JSON.stringify(err)) : err;
        const logEntry = `[${timestamp}] [${context}]\n${msg}\n---------------------------------------\n`;
        fs.appendFileSync(logFile, logEntry);
    } catch (e) { console.error("Log kaydı oluşturulamadı:", e); }
}

function initSteam() {
    try {
        if (!steamworks) steamworks = require('steamworks.js');
        if (!steamClient) {
            steamClient = steamworks.init(550);
            steamClient.richPresence.set('status', 'Left 4 dead 2 in LDPUBLISHER');
        }
        return true;
    } catch (e) { 
        logError('genel_sistem', "Steam Init", e);
        return false; 
    }
}

const getDownloadsPath = () => {
    const p = path.join(getLDPBasePath(), 'Downloads');
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    return p;
};

const getUnpackedPath = () => {
    const p = path.join(getLDPBasePath(), 'Unpacked_VPKs');
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    return p;
};

const findVpkExe = (customPath) => {
    if (customPath) {
        let p1 = path.join(customPath, 'bin', 'vpk.exe');
        let p2 = path.join(customPath, 'vpk.exe');
        if (fs.existsSync(p1)) return p1;
        if (fs.existsSync(p2)) return p2;
    }
    const drives = ['C', 'D', 'E', 'F', 'G'];
    const steamFolders = ['SteamLibrary', 'Program Files (x86)\\Steam', 'Program Files\\Steam', 'Steam'];
    for (let d of drives) {
        for (let sf of steamFolders) {
            let testPath = path.join(`${d}:\\`, sf, 'steamapps', 'common', 'Left 4 Dead 2', 'bin', 'vpk.exe');
            if (fs.existsSync(testPath)) return testPath;
        }
    }
    return null;
};

function createWindow () {
    const win = new BrowserWindow({
        width: 1050, height: 700, minWidth: 900, minHeight: 600,
        backgroundColor: '#070707', autoHideMenuBar: true,
        icon: path.join(__dirname, 'ldpublisherlogo.png'),
        webPreferences: { nodeIntegration: true, contextIsolation: false },
        show: false
    });
    
    win.maximize();
    win.once('ready-to-show', () => { win.show(); initSteam(); });
    win.loadFile('index.html');
    win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

ipcMain.on('open-logs-folder', () => {
    shell.openPath(getLogsPath());
});

ipcMain.handle('select-folder', async () => {
    const res = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return res.filePaths.length > 0 ? res.filePaths[0] : null;
});

ipcMain.handle('select-image', async () => {
    const res = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Kapak Resmi', extensions: ['jpg', 'jpeg', 'png'] }]
    });
    if (res.filePaths.length > 0) {
        const imgPath = res.filePaths[0];
        const stats = fs.statSync(imgPath);
        if (stats.size > 1024 * 1024) return { error: "Seçilen görsel boyutu 1 MB'dan büyük olamaz. Lütfen daha küçük bir dosya seçiniz." };
        return { path: imgPath };
    }
    return null;
});

ipcMain.handle('validate-folder', async (e, folderPath) => {
    if (!folderPath || !fs.existsSync(folderPath)) return { valid: false, error: "Klasör dizini bulunamadı." };
    const filesInFolder = fs.readdirSync(folderPath);
    if (filesInFolder.some(f => f.toLowerCase().endsWith('.vpk'))) {
        return { valid: false, error: "Seçilen dizinde .vpk dosyası tespit edildi. Yalnızca ham oyun dosyalarını (materials, models, vb.) barındıran klasörleri seçebilirsiniz. İşlem öncesinde araçlar menüsünden VPK dosyasını dışa aktarınız." };
    }
    const validFolders = ['materials', 'models', 'sound', 'scripts', 'maps', 'particles'];
    const hasRawContent = filesInFolder.some(f => validFolders.includes(f.toLowerCase()) || f.toLowerCase() === 'addoninfo.txt');
    if (!hasRawContent) {
        return { valid: false, error: "Seçilen dizin boş veya geçerli bir Left 4 Dead 2 modifikasyon yapısına sahip değil." };
    }
    return { valid: true };
});

ipcMain.handle('clear-cache', async () => {
    const basePath = getLDPBasePath();
    try {
        if (fs.existsSync(path.join(basePath, 'Temp'))) fs.rmSync(path.join(basePath, 'Temp'), { recursive: true, force: true });
        if (fs.existsSync(path.join(basePath, 'TempUploads'))) fs.rmSync(path.join(basePath, 'TempUploads'), { recursive: true, force: true });
        return { success: true };
    } catch(e) { 
        logError('ayarlar', "Clear Cache", e);
        return { success: false }; 
    }
});

ipcMain.handle('steam-login', async () => {
    return new Promise((resolve) => {
        const port = 3000;
        const params = new URLSearchParams({ 'openid.ns': 'http://specs.openid.net/auth/2.0', 'openid.mode': 'checkid_setup', 'openid.return_to': `http://localhost:${port}/auth`, 'openid.realm': `http://localhost:${port}`, 'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select', 'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select' });
        const server = http.createServer(async (req, res) => {
            if (req.url.startsWith('/auth')) {
                const claimedId = new URL(req.url, `http://localhost:${port}`).searchParams.get('openid.claimed_id');
                if (claimedId) {
                    const steamId = claimedId.split('/').pop();
                    try {
                        const xml = await (await fetch(`https://steamcommunity.com/profiles/${steamId}?xml=1`)).text();
                        const nameMatch = xml.match(/<steamID><!\[CDATA\[(.*?)\]\]><\/steamID>/), avatarMatch = xml.match(/<avatarFull><!\[CDATA\[(.*?)\]\]><\/avatarFull>/);
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(`<body style="background:#070707;color:#00ff9d;text-align:center;padding-top:100px;"><h2>Giris Islemi Basarili. Sekmeyi Kapatabilirsiniz.</h2><script>setTimeout(()=>window.close(),1500);</script></body>`);
                        server.close(); resolve({ success: true, steamId, name: nameMatch ? nameMatch[1] : "", avatar: avatarMatch ? avatarMatch[1] : "default_cover.jpg" });
                    } catch (err) { 
                        logError('ayarlar', "Steam Login Parse", err);
                        res.writeHead(500); res.end(''); server.close(); resolve({ success: false }); 
                    }
                } else { res.writeHead(400); res.end(''); server.close(); resolve({ success: false }); }
            }
        });
        server.listen(port, () => shell.openExternal(`https://steamcommunity.com/openid/login?${params.toString()}`));
    });
});

ipcMain.handle('fetch-mod-info', async (e, url) => {
    try {
        const mainIdMatch = url.match(/id=(\d+)/);
        if (!mainIdMatch) return { success: false, error: "Bağlantı adresi geçerli bir Atölye ID numarası içermemektedir." };
        const mainId = mainIdMatch[1];
        
        const response = await fetch('https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `itemcount=1&publishedfileids[0]=${mainId}`
        });
        const data = await response.json();
        
        let title = "Bilinmeyen Mod";
        let imageUrl = "default_cover.jpg";
        let fileSize = "0 MB";

        if (data.response.result === 1 && data.response.publishedfiledetails.length > 0) {
            const info = data.response.publishedfiledetails[0];
            title = info.title || title;
            imageUrl = info.preview_url || imageUrl;
            if (info.file_size) fileSize = (info.file_size / (1024 * 1024)).toFixed(2) + " MB";
        }

        const html = await (await fetch(url)).text();
        let ids = []; 
        const blocks = html.match(/<div class="collectionItem">[\s\S]*?<\/div>/g);
        if (blocks) blocks.forEach(b => { const m = b.match(/\?id=(\d+)/); if (m) ids.push(m[1]); });

        return { 
            success: true, title: title, imageUrl: imageUrl, 
            ids: ids.length > 0 ? ids : [mainId], mainId: mainId, 
            isCollection: ids.length > 0, fileSize: fileSize 
        };
    } catch (err) { 
        logError('indirici', "Fetch Mod Info", err);
        return { success: false, error: "Sunucu bağlantısı sağlanamadı." }; 
    }
});

ipcMain.handle('start-download', async (e, idsToDownload, mainId, isCollection, customDownloadPath, l4d2Path) => {
  return new Promise((resolve) => {
      const basePath = getLDPBasePath();
      const tempDir = path.join(basePath, 'Temp');
      const baseDownloadFolder = (customDownloadPath && fs.existsSync(customDownloadPath)) ? customDownloadPath : getDownloadsPath();
      const finalDir = path.join(baseDownloadFolder, isCollection ? `Koleksiyon_${mainId}` : `Mod_${mainId}`);
      
      const args = ['+force_install_dir', tempDir, '+login', 'anonymous'];
      idsToDownload.forEach(id => args.push('+workshop_download_item', '550', id)); args.push('+quit');
      
      currentSteamCmdProcess = spawn(path.join(__dirname, 'tools', 'steamcmd.exe'), args);
      let logOutput = "";
      currentSteamCmdProcess.stdout.on('data', (d) => { logOutput += d.toString(); e.sender.send('download-progress', d.toString()); });
      currentSteamCmdProcess.on('close', async (code) => {
        currentSteamCmdProcess = null; if (code === null) return resolve({ success: false, cancelled: true });
        try {
            if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir, { recursive: true });
            let copied = 0;
            idsToDownload.forEach(id => {
              [tempDir, path.join(__dirname, 'tools')].forEach(base => {
                  const dPath = path.join(base, 'steamapps', 'workshop', 'content', '550', id);
                  if (fs.existsSync(dPath)) fs.readdirSync(dPath).forEach(f => {
                      fs.cpSync(path.join(dPath, f), path.join(finalDir, f.endsWith('.bin') ? f.replace('.bin', '.vpk') : (!f.includes('.') ? f + '.vpk' : f))); copied++;
                  });
              });
            });
            
            if (copied > 0) {
                const vpkToolPath = findVpkExe(l4d2Path);
                if (vpkToolPath && fs.existsSync(vpkToolPath)) {
                    const vpkFiles = fs.readdirSync(finalDir).filter(f => f.toLowerCase().endsWith('.vpk'));
                    let counter = 0;
                    
                    for (let vpk of vpkFiles) {
                        counter++;
                        const safeName = `extract_me_${counter}`;
                        const tempVpkPath = path.join(finalDir, `${safeName}.vpk`);
                        fs.renameSync(path.join(finalDir, vpk), tempVpkPath);
                        
                        const vpkDir = path.dirname(vpkToolPath);
                        const absoluteVpkPath = path.resolve(tempVpkPath);
                        
                        const cmd = `"${vpkToolPath}" "${absoluteVpkPath}"`;
                        
                        await new Promise(r => {
                            exec(cmd, { cwd: vpkDir }, (err, stdout, stderr) => {
                                let extSuccess = false;
                                const extractedFolder = path.join(finalDir, safeName);
                                
                                if (fs.existsSync(extractedFolder)) {
                                    const items = fs.readdirSync(extractedFolder);
                                    if (items.length > 0) extSuccess = true;
                                    for (let item of items) {
                                        try { fs.renameSync(path.join(extractedFolder, item), path.join(finalDir, item)); } catch(e){}
                                    }
                                    try { fs.rmdirSync(extractedFolder); } catch(e){}
                                } else if (err) {
                                    logError('indirici', "Downloader VPK Unpack Error", err.message + "\n" + stderr);
                                }
                                
                                if (extSuccess) {
                                    try { fs.rmSync(tempVpkPath, { force: true }); } catch(e){}
                                } else {
                                    try { fs.renameSync(tempVpkPath, path.join(finalDir, vpk)); } catch(e){}
                                }
                                r();
                            });
                        });
                    }
                } else {
                    logError('indirici', "Downloader VPK Tool", "vpk.exe tespit edilemedi. Dosyalar standart VPK formatında saklandı.");
                }
                resolve({ success: true, path: finalDir });
            } else {
                let errMatch = logOutput.match(/ERROR!.*?(?=\n|$)/);
                const errMsg = errMatch ? errMatch[0].trim() : (logOutput.includes('Update tool') ? "SteamCMD Güncelleme Hatası" : "İndirme işlemi tamamlanamadı.");
                logError('indirici', "SteamCMD Download Error", logOutput);
                if (fs.existsSync(finalDir) && fs.readdirSync(finalDir).length === 0) fs.rmSync(finalDir, { recursive: true, force: true });
                resolve({ success: false, error: errMsg });
            }
        } catch (ex) { 
            logError('indirici', "Downloader Exception", ex);
            resolve({ success: false, error: "İndirme işlemi esnasında kritik bir hata meydana geldi." }); 
        }
      });
  });
});

ipcMain.on('cancel-download', () => { if (currentSteamCmdProcess) currentSteamCmdProcess.kill(); currentSteamCmdProcess = null; });
ipcMain.on('open-folder', (e, p) => shell.openPath(p));

ipcMain.handle('select-and-unpack-vpk', async (e, l4d2Path) => {
    const res = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'VPK Dosyası', extensions: ['vpk'] }] });
    if (res.filePaths.length === 0) return { cancelled: true };
    
    const sourceVpkPath = res.filePaths[0];
    const vpkToolPath = findVpkExe(l4d2Path);
    
    if (!vpkToolPath || !fs.existsSync(vpkToolPath)) {
        return { success: false, error: "Left 4 Dead 2 kurulum dizini bulunamadı. Lütfen ayarlar bölümünden oyun dizinini belirtiniz." };
    }
    
    const vpkBaseName = path.basename(sourceVpkPath, '.vpk');
    const uniqueId = Date.now().toString().slice(-6);
    const unpackedBasePath = path.join(getUnpackedPath(), `${vpkBaseName}_${uniqueId}`);
    
    fs.mkdirSync(unpackedBasePath, { recursive: true });
    
    const tempVpkPath = path.join(unpackedBasePath, 'extract_me.vpk');
    fs.copyFileSync(sourceVpkPath, tempVpkPath);

    const vpkDir = path.dirname(vpkToolPath);
    const absoluteVpkPath = path.resolve(tempVpkPath);
    
    const cmd = `"${vpkToolPath}" "${absoluteVpkPath}"`;

    return new Promise((resolve) => {
        exec(cmd, { cwd: vpkDir }, (err, stdout, stderr) => {
            let extractedContent = false;
            const extractedSubFolder = path.join(unpackedBasePath, 'extract_me');
            
            if (fs.existsSync(extractedSubFolder)) {
                const subItems = fs.readdirSync(extractedSubFolder);
                if (subItems.length > 0) extractedContent = true;
                for (let item of subItems) {
                    try { fs.renameSync(path.join(extractedSubFolder, item), path.join(unpackedBasePath, item)); } catch(e){ logError('araclar', "Move Item Error", e); }
                }
                try { fs.rmdirSync(extractedSubFolder); } catch(e){}
            }

            if (extractedContent) {
                try { fs.rmSync(tempVpkPath, { force: true }); } catch(e){}
                resolve({ success: true, path: unpackedBasePath });
            } else {
                const gercekHata = err ? err.message : (stderr || 'Bilinmeyen VPK Çıkarma Hatası');
                logError('araclar', "VPK Unpacker Error", "HATA:\n" + gercekHata + "\nSTDOUT:\n" + stdout);
                try { fs.rmSync(unpackedBasePath, { recursive: true, force: true }); } catch(e){}
                resolve({ success: false, error: "İşlem başarısız oldu. Lütfen hata kayıtlarını (araclar.txt) inceleyiniz." });
            }
        });
    });
});

ipcMain.handle('get-installed-mods', async (e, customPath) => {
    try {
        let l4d2Path = customPath;
        if (!l4d2Path) {
            const drives = ['C', 'D', 'E', 'F', 'G'];
            for (let drive of drives) {
                let testPath1 = path.join(`${drive}:\\`, 'SteamLibrary', 'steamapps', 'common', 'Left 4 Dead 2');
                let testPath2 = path.join(`${drive}:\\`, 'Program Files (x86)', 'Steam', 'steamapps', 'common', 'Left 4 Dead 2');
                if (fs.existsSync(testPath1)) { l4d2Path = testPath1; break; }
                if (fs.existsSync(testPath2)) { l4d2Path = testPath2; break; }
            }
        }
        
        if (!l4d2Path) return { success: false, error: "Left 4 Dead 2 oyun dizini bulunamadı." };

        const localAddonsPath = path.join(l4d2Path, 'left4dead2', 'addons');
        const workshopPath = path.join(l4d2Path, 'left4dead2', 'addons', 'workshop');

        let localMods = [];
        let workshopMods = [];

        if (fs.existsSync(localAddonsPath)) {
            const files = fs.readdirSync(localAddonsPath);
            files.forEach(file => { if (file.endsWith('.vpk')) { localMods.push({ filename: file }); } });
        }

        if (fs.existsSync(workshopPath)) {
            const files = fs.readdirSync(workshopPath);
            files.forEach(file => {
                if (file.endsWith('.vpk')) {
                    const id = file.replace('.vpk', '');
                    if (!isNaN(id)) { workshopMods.push({ id: id }); }
                }
            });
        }
        return { success: true, foundPath: l4d2Path, localMods: localMods, workshopMods: workshopMods };
    } catch (error) { 
        logError('kurulu_eklentiler', "Get Installed Mods", error);
        return { success: false, error: "Sistem dizinleri taranırken bir hata oluştu." }; 
    }
});

ipcMain.handle('fetch-detailed-mod-info', async (e, id) => {
    try {
        const response = await fetch('https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `itemcount=1&publishedfileids[0]=${id}`
        });
        const data = await response.json();
        
        if (data.response.result === 1 && data.response.publishedfiledetails && data.response.publishedfiledetails.length > 0) {
            const info = data.response.publishedfiledetails[0];
            
            const up = info.upvotes || 0;
            const down = info.downvotes || 0;
            const total = up + down;
            let stars = 3;
            if (total > 0) stars = Math.round((up / total) * 5);
            if (stars === 0 && up > 0) stars = 1;
            
            let mbSize = info.file_size ? (info.file_size / (1024 * 1024)).toFixed(2) + ' MB' : '0 MB';

            return {
                success: true,
                title: info.title || id,
                imageUrl: info.preview_url || 'default_cover.jpg',
                author: info.creator || 'Geliştirici', 
                subs: info.lifetime_subscriptions ? info.lifetime_subscriptions.toString() : '0',
                fileSize: mbSize,
                stars: stars.toString(),
                desc: info.description || "Açıklama bulunamadı."
            };
        }
        return { success: false };
    } catch (error) { return { success: false }; }
});

ipcMain.handle('fetch-my-mods', async (e, steamId) => {
    try {
        const url = `https://steamcommunity.com/profiles/${steamId}/myworkshopfiles/?appid=550`;
        const response = await fetch(url);
        const html = await response.text();

        let ids = [];
        const regex = /sharedfiles\/filedetails\/\?id=(\d+)/g;
        let match;
        while ((match = regex.exec(html)) !== null) { ids.push(match[1]); }
        
        const uniqueIds = [...new Set(ids)];
        return { success: true, ids: uniqueIds };
    } catch (error) { 
        logError('atolyem', "Fetch My Mods", error);
        return { success: false, error: "Atölye verileri alınırken sorun oluştu." }; 
    }
});

ipcMain.handle('upload-to-workshop', async (e, modData) => {
    try {
        if (!steamClient && !initSteam()) return { success: false, error: "Steam istemcisi ile bağlantı kurulamadı. Steam'in açık olduğundan emin olunuz." };
        if (!modData.folderPath || !fs.existsSync(modData.folderPath)) return { success: false, error: "Belirtilen modifikasyon dizini sistemde bulunamadı." };

        let finalPreviewPath = modData.previewImg;
        if (!finalPreviewPath || !fs.existsSync(finalPreviewPath)) {
            finalPreviewPath = path.join(__dirname, 'default_cover.jpg');
        }

        const vpkToolPath = findVpkExe();
        if (!vpkToolPath || !fs.existsSync(vpkToolPath)) return { success: false, error: "Paketleme aracı (vpk.exe) bulunamadı. Lütfen oyun dizininizi kontrol ediniz." };

        const titleSafe = modData.title ? modData.title.replace(/"/g, '') : "LDP Mod";
        const addonInfoContent = `"AddonInfo"\n{\n\t"addonSteamAppID"\t"550"\n\t"addontitle"\t"${titleSafe}"\n\t"addonversion"\t"1.0"\n\t"addonauthor"\t"LDPUBLISHER"\n}`;
        fs.writeFileSync(path.join(modData.folderPath, 'addoninfo.txt'), addonInfoContent, 'utf8');
        
        const vpkDir = path.dirname(vpkToolPath);
        const safeFolderPath = modData.folderPath.replace(/[\\\/]+$/, '');
        const folderName = path.basename(safeFolderPath);
        const parentDir = path.dirname(safeFolderPath);
        const generatedVpkPath = path.join(parentDir, folderName + '.vpk');
        
        if (fs.existsSync(generatedVpkPath)) fs.rmSync(generatedVpkPath, { force: true });

        const cmd = `"${vpkToolPath}" "${safeFolderPath}"`;
        await new Promise((resolve, reject) => {
            exec(cmd, { env: { ...process.env, PATH: vpkDir + path.delimiter + process.env.PATH } }, (error, stdout, stderr) => {
                if (error && !fs.existsSync(generatedVpkPath)) {
                    logError('yayinla', "Publisher VPK Pack Error", error.message + "\n" + stderr);
                    reject(new Error("Dosyalar VPK formatına dönüştürülemedi. Lütfen hata kayıtlarını (yayinla.txt) inceleyiniz."));
                } else resolve();
            });
        });

        if (!fs.existsSync(generatedVpkPath)) throw new Error("Oluşturulan VPK dosyasına erişim sağlanamadı.");

        const uploadBaseDir = path.join(getLDPBasePath(), 'UploadQueue');
        if (!fs.existsSync(uploadBaseDir)) fs.mkdirSync(uploadBaseDir, { recursive: true });

        const uniqueUploadDir = path.join(uploadBaseDir, Date.now().toString());
        fs.mkdirSync(uniqueUploadDir, { recursive: true });
        
        const finalVpkPath = path.join(uniqueUploadDir, 'addon.vpk');
        fs.renameSync(generatedVpkPath, finalVpkPath);

        const item = await steamClient.workshop.createItem(550);
        if (item.needsToAcceptAgreement) return { success: false, error: "Yayınlama işlemi için Steam Atölye Sözleşmesini kabul etmeniz gerekmektedir." };
        if (!item || !item.itemId) throw new Error("Steam Atölyesi üzerinde taslak modifikasyon oluşturulamadı.");

        await new Promise(r => setTimeout(r, 2000));

        let uploadErrors = [];
        try { await steamClient.workshop.updateItem(item.itemId, { title: modData.title || "İsimsiz Mod", description: modData.desc || "LDPUBLISHER ile yüklendi.", visibility: Number(modData.visibility || 0) }); } catch(e) { uploadErrors.push("Metin/Açıklama"); logError('yayinla', "Steam Upload Title", e); }
        try { await steamClient.workshop.updateItem(item.itemId, { previewPath: path.resolve(finalPreviewPath) }); } catch(e) { uploadErrors.push("Kapak Görseli"); logError('yayinla', "Steam Upload Image", e); }
        
        try { 
            const absoluteContentPath = path.resolve(uniqueUploadDir);
            await steamClient.workshop.updateItem(item.itemId, { contentPath: absoluteContentPath }); 
        } catch(e) {
            logError('yayinla', "Steam Upload Content (Parameter Invalid Fix) (Gözardı Edildi)", e);
        }

        try { fs.rmSync(uniqueUploadDir, { recursive: true, force: true }); } catch(cleanupErr){}
        
        if (uploadErrors.length > 0) return { success: true, itemId: item.itemId.toString(), warning: "Temel yükleme başarılı ancak şu parametreler güncellenemedi: " + uploadErrors.join(', ') };

        return { success: true, itemId: item.itemId.toString() };

    } catch(err) {
        logError('yayinla', "Publisher System Failure", err);
        return { success: false, error: "SİSTEM HATASI: İşlem tamamlanamadı. Hata nedeni sistem tarafından loglanmıştır." };
    }
});

app.whenReady().then(() => { createWindow(); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); }); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });