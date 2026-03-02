import express from 'express';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium'; 
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = new Map
const app = express()

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'temp'));
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({ extended: true }))

app.get('/', (req, res) => {
    const dataForRender = {
    name: '', 
    dilcount: '', 
    datareg: '',
    alertinfo: '' 
    };
    res.render('index', dataForRender);
});

app.post('/datasub', async (req, res) => {
    let name_cour = req.body.info
    if(db.has(name_cour)){
        res.render('index', {name: name_cour, dilcount: db.get(name_cour)[0], datareg: db.get(name_cour)[1], alertinfo: '' });
    }
    else{
        let answer = (await runBot(name_cour))
        res.render('index', {name: answer[2], dilcount: answer[0], datareg: answer[1], alertinfo: '' });
    }
})
app.post('/cleardata',function (req, res) {
    let c = req.body.refresh
    if(c == 'очистить'){
         db.clear()
         const dataForRender = {
        name: '', 
        dilcount: '', 
        datareg: '',
        alertinfo: 'ДАННЫЕ ОЧИЩЕНЫ' 
        };
        res.render('index', dataForRender);
    }
    else{
        const dataForRender = {
        name: '', 
        dilcount: '', 
        datareg: '',
        alertinfo: 'ПОЖАЛУЙСТА ВВЕДИТЕ ОЧИСТИТЬ' 
        };
    res.render('index', dataForRender);
    }
})
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server connect: http://localhost:${port}`);
});
async function runBot(imname) {
    console.log(imname)
    if (!imname) return ['error', 'error', 'error'];

    // ЛОГИКА СЕССИИ ДЛЯ VERCEL
    const sourceDir = path.join(__dirname, 'my_bot_session');
    const targetDir = path.join(os.tmpdir(), 'browser_session');

    // Копируем сессию в /tmp (там разрешена запись)
    if (fs.existsSync(sourceDir)) {
        await fs.copy(sourceDir, targetDir);
    }

    let browser;
    try {
        // Проверяем, запущен ли код на сервере Vercel
        const isVercel = process.env.VERCEL;

        const options = {
            args: isVercel ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: chromium.defaultViewport,
            // Если на Vercel - берем путь из библиотеки, если дома - путь к твоему Chrome
            executablePath: isVercel 
                ? await chromium.executablePath() 
                : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 
            headless: isVercel ? chromium.headless : false, // Дома лучше false, чтобы видеть окно
            userDataDir: targetDir,
        };

        browser = await puppeteer.launch(options);

        const page = await browser.newPage();
        await page.goto('https://delivery-os.wolt.com/couriers', { waitUntil: 'networkidle2' });
        await page.waitForSelector('.cb_DataTable_Row_2be', {timeout:15000})
        names = await page.$$eval('.cb_DataTable_Row_2be > .cb_DataTable_Column_2be:nth-child(2) > div > div > div:nth-child(1)', e => {return e.map((el) => el.innerText)});
        let count = 0
        let page_max_string = await page.$eval('footer > div > div > button:nth-child(2)', e => e.getAttribute('title'))
        let page_max_num = Number(page_max_string.slice(10))
        while (!(names.includes(imname))){
         await page.click('footer > div > div > button[title="Next page"]')
         count += 1
         if(count == page_max_num){
            await browser.close()
            return ['error', 'error', 'error']
        }
        }
        await page.click(`.cb_DataTable_Row_2be:nth-child(${names.indexOf(imname) + 1})`,
        {
        button: 'left',
        delay: 100,
        })
        await new Promise(r => setTimeout(r, 2000));
        let data_c = await page.$eval('.cb_ModalContent_Root_954 > div > section[aria-label="Details"] > ul >  li:nth-child(5) > div:nth-child(2)', e => e.innerText)
        await page.click('section[aria-label="Basic information"]>div:nth-child(2)>div:nth-child(4)>button')
        await page.click('button[role="menuitem"]')
        await new Promise(r => setTimeout(r, 2000)) 
        await page.click('div[role="presentation"]:nth-child(2)')
        await new Promise(r => setTimeout(r, 2000))
        let count_delivery = await page.$eval('li[role="listitem"] > div > ul > li:nth-child(4) > div:nth-child(1)', e => e.innerText)
        await page.click('div[role="group"]>div>a[title="All couriers"]')
        await new Promise(r => setTimeout(r, 2000)) 
        await browser.close()
        db.set(imname, [count_delivery, data_c])
        return [count_delivery, data_c, imname]

    } catch (error) {
        console.error('Ошибка бота:', error);
        if (browser) await browser.close();
        return ['error', 'error', 'error'];
    }
}