import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

const SESSION_PATH = path.resolve(__dirname, '..', 'facebook-session.json');

async function main() {
  console.log('=== Facebook Local Worker Authentication ===');
  console.log('Chương trình sẽ mở trình duyệt Chromium.');
  console.log('Vui lòng đăng nhập tài khoản Facebook của bạn trong cửa sổ trình duyệt đó.');
  console.log('Sau khi đăng nhập thành công, phiên làm việc (session) của bạn sẽ được lưu trữ an toàn.');
  console.log('----------------------------------------------------');

  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-notifications']
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://www.facebook.com');

  console.log('Đang chờ bạn hoàn tất đăng nhập...');

  let loggedIn = false;
  
  // Wait up to 5 minutes (300 seconds)
  for (let i = 0; i < 300; i++) {
    if (browser.contexts().length === 0 || page.isClosed()) {
      break;
    }

    try {
      const cookies = await context.cookies();
      const hasCUser = cookies.some(cookie => cookie.name === 'c_user');
      
      if (hasCUser) {
        loggedIn = true;
        break;
      }
    } catch (e) {
      break;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  if (loggedIn) {
    console.log('Đã phát hiện đăng nhập thành công!');
    const storageState = await context.storageState();
    
    // Ensure parent directory exists
    const dir = path.dirname(SESSION_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(SESSION_PATH, JSON.stringify(storageState, null, 2));
    console.log(`Lưu phiên làm việc thành công tại: ${SESSION_PATH}`);
  } else {
    console.log('Đăng nhập thất bại hoặc trình duyệt bị đóng trước khi hoàn tất.');
  }

  try {
    await browser.close();
  } catch (e) {}
  
  process.exit(0);
}

main().catch(err => {
  console.error('Lỗi trong quá trình đăng nhập:', err);
  process.exit(1);
});
