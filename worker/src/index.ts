import axios from 'axios';
import { chromium, BrowserContext } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as dotenv from 'dotenv';

dotenv.config();

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const SESSION_PATH = path.resolve(__dirname, '..', 'facebook-session.json');
const POLL_INTERVAL = 10000; // 10 seconds

async function downloadFile(url: string, dest: string): Promise<string> {
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream'
  });
  
  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(dest);
    response.data.pipe(writer);
    writer.on('finish', () => resolve(dest));
    writer.on('error', reject);
  });
}

async function processJob(job: any) {
  console.log(`\n[Job ${job.id}] Bắt đầu xử lý đăng bài cho trang "${job.pageName}"...`);
  
  if (!fs.existsSync(SESSION_PATH)) {
    throw new Error('Chưa đăng nhập Facebook. Vui lòng chạy lệnh: npm run login trước.');
  }

  // 1. Lock job on backend
  await axios.post(`${BACKEND_URL}/api/worker/jobs/${job.id}/start`);
  console.log(`[Job ${job.id}] Đã khóa trạng thái thành PROCESSING.`);

  const isHeadless = process.env.HEADLESS === 'true';
  const browser = await chromium.launch({
    headless: isHeadless,
    slowMo: isHeadless ? 0 : 100,
    args: [
      '--disable-notifications',
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox'
    ]
  });

  let context: BrowserContext | null = null;
  let page: any = null;
  const tempFiles: string[] = [];

  try {
    context = await browser.newContext({
      storageState: SESSION_PATH
    });

    page = await context.newPage();
    
    // Go to the target facebook page feed
    console.log(`[Job ${job.id}] Đang truy cập trang Facebook: https://www.facebook.com/${job.pageId}`);
    await page.goto(`https://www.facebook.com/${job.pageId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    // Wait a bit for dynamic content to load
    await page.waitForTimeout(4000);

    // Verify if we are logged in
    const isLoggedIn = !(await page.locator('input[name="email"]').isVisible());
    if (!isLoggedIn) {
      throw new Error('Phiên đăng nhập Facebook đã hết hạn. Hãy chạy lệnh: npm run login để xác thực lại.');
    }

    // 2. Click "Create post" / "Bạn đang nghĩ gì?"
    console.log(`[Job ${job.id}] Đang mở hộp tạo bài viết...`);
    
    const postBoxSelectors = [
      'div[role="button"]:has-text("Bạn đang nghĩ gì?")',
      'div[role="button"]:has-text("Create a post")',
      'div[role="button"]:has-text("Tạo bài viết")',
      'span:has-text("Bạn đang nghĩ gì?")',
      'span:has-text("Tạo bài viết")',
      'span:has-text("Create a post")'
    ];
    
    let clicked = false;
    for (const selector of postBoxSelectors) {
      try {
        const locator = page.locator(selector).first();
        if (await locator.isVisible()) {
          await locator.click();
          clicked = true;
          break;
        }
      } catch (e) {}
    }

    if (!clicked) {
      const button = page.getByRole('button').filter({ hasText: /Bạn đang nghĩ gì|Create a post|Tạo bài viết/ }).first();
      if (await button.isVisible()) {
        await button.click();
      } else {
        throw new Error('Không tìm thấy hộp tạo bài viết trên trang Facebook. Hãy kiểm tra xem tài khoản có quyền đăng bài hay không.');
      }
    }

    // Wait for the modal/dialog to appear
    await page.waitForSelector('div[role="dialog"]');
    console.log(`[Job ${job.id}] Đã mở modal soạn thảo.`);

    // 3. Write content
    const textbox = page.locator('div[role="dialog"] div[role="textbox"][contenteditable="true"]').first();
    await textbox.focus();
    await textbox.fill(job.content);
    console.log(`[Job ${job.id}] Đã nhập nội dung bài viết.`);

    // 4. Handle Media upload if present
    if (job.mediaUrls && job.mediaUrls.length > 0) {
      console.log(`[Job ${job.id}] Phát hiện ${job.mediaUrls.length} ảnh cần tải lên.`);

      // Check if file input is already in the dialog DOM
      let fileInput = page.locator('div[role="dialog"] input[type="file"]').first();
      let fileInputExists = await fileInput.count().catch(() => 0) > 0;

      if (!fileInputExists) {
        // Try clicking the photo/video button inside the dialog using multiple strategies
        const mediaSelectors = [
          'div[aria-label="Ảnh/video"]',
          'div[aria-label="Photo/video"]',
          'div[aria-label="Ảnh/Video"]',
          '[data-testid="media-attachment-button"]',
        ];

        let mediaClicked = false;
        for (const sel of mediaSelectors) {
          const loc = page.locator(`div[role="dialog"] ${sel}`).first();
          if (await loc.isVisible().catch(() => false)) {
            try {
              // Try normal click first
              await loc.click({ timeout: 5000 });
              mediaClicked = true;
              console.log(`[Job ${job.id}] Click nút ảnh/video thành công (normal click).`);
              break;
            } catch {
              try {
                // Force click (bypasses overlay interception)
                await loc.click({ force: true, timeout: 5000 });
                mediaClicked = true;
                console.log(`[Job ${job.id}] Click nút ảnh/video thành công (force click).`);
                break;
              } catch {
                try {
                  // JS click as last resort
                  await loc.evaluate((el: HTMLElement) => el.click());
                  mediaClicked = true;
                  console.log(`[Job ${job.id}] Click nút ảnh/video thành công (JS click).`);
                  break;
                } catch {}
              }
            }
          }
        }

        if (!mediaClicked) {
          console.warn(`[Job ${job.id}] Không click được nút ảnh/video. Thử tìm input[type=file] trực tiếp.`);
        }

        // Wait for file input to appear inside the dialog (state: attached, up to 8s)
        await page.waitForSelector('div[role="dialog"] input[type="file"]', { state: 'attached', timeout: 8000 }).catch(() => {
          console.warn(`[Job ${job.id}] Không tìm thấy input file trong dialog.`);
        });
      }

      fileInput = page.locator('div[role="dialog"] input[type="file"]').first();
      const hasFileInput = await fileInput.count().catch(() => 0) > 0;

      if (hasFileInput) {
        const localPaths: string[] = [];
        const tempDir = os.tmpdir();
        
        for (let idx = 0; idx < job.mediaUrls.length; idx++) {
          let url = job.mediaUrls[idx];
          // Upscale Unsplash images to 1200px (Facebook requires min 600px)
          if (url.includes('unsplash.com')) {
            url = url.replace(/[?&]w=\d+/, '').replace(/[?&]q=\d+/, '');
            const sep = url.includes('?') ? '&' : '?';
            url = `${url}${sep}w=1200&q=85`;
          }
          const ext = path.extname(url.split('?')[0]) || '.jpg';
          const dest = path.join(tempDir, `dragonacy_img_${job.id}_${idx}${ext}`);
          console.log(`[Job ${job.id}] Đang tải ảnh ${idx+1} (${url.substring(0, 60)}...`);
          await downloadFile(url, dest);
          localPaths.push(dest);
          tempFiles.push(dest);
        }

        await fileInput.setInputFiles(localPaths, { noWaitAfter: true });
        console.log(`[Job ${job.id}] Đã tải các tệp ảnh lên trình duyệt.`);
        await page.waitForTimeout(5000); // Wait for upload preview to render
      } else {
        console.warn(`[Job ${job.id}] Bỏ qua upload ảnh vì không tìm thấy input file trong dialog.`);
      }
    }

    // 5. Submit post
    console.log(`[Job ${job.id}] Đang gửi bài đăng...`);
    
    // We list both step-1 (Tiếp/Next) and final-step (Đăng/Post/Chia sẻ) buttons
    const step1Selectors = [
      'div[role="dialog"] div[role="button"][aria-label="Tiếp"]',
      'div[role="dialog"] div[role="button"][aria-label="Next"]',
      'div[role="dialog"] div[role="button"]:has-text("Tiếp")',
      'div[role="dialog"] div[role="button"]:has-text("Next")',
    ];

    const finalSelectors = [
      'div[role="dialog"] div[role="button"][aria-label="Đăng"]',
      'div[role="dialog"] div[role="button"][aria-label="Post"]',
      'div[role="dialog"] div[role="button"][aria-label="Chia sẻ"]',
      'div[role="dialog"] div[role="button"][aria-label="Share"]',
      'div[role="dialog"] div[role="button"]:has-text("Đăng")',
      'div[role="dialog"] div[role="button"]:has-text("Post")',
      'div[role="dialog"] div[role="button"]:has-text("Chia sẻ")',
      'div[role="dialog"] div[role="button"]:has-text("Share")',
      'div[role="dialog"] button:has-text("Đăng")',
      'div[role="dialog"] button:has-text("Post")',
      'div[role="dialog"] button:has-text("Chia sẻ")',
      'div[role="dialog"] button:has-text("Share")'
    ];

    // Helper function to find, wait, and click a button
    const clickButton = async (selectors: string[], labelName: string): Promise<boolean> => {
      let button = null;
      for (const selector of selectors) {
        const locator = page.locator(selector).first();
        if (await locator.isVisible().catch(() => false)) {
          button = locator;
          break;
        }
      }

      if (!button) {
        return false;
      }

      console.log(`[Job ${job.id}] Tìm thấy nút "${labelName}". Đang chờ nút được kích hoạt...`);
      let isReady = false;
      for (let i = 0; i < 20; i++) {
        const ariaDisabled = await button.getAttribute('aria-disabled').catch(() => null);
        const isEnabled = await button.isEnabled().catch(() => false);
        if (ariaDisabled !== 'true' && isEnabled) {
          isReady = true;
          break;
        }
        await page.waitForTimeout(500);
      }

      if (!isReady) {
        console.warn(`[Job ${job.id}] Cảnh báo: Nút "${labelName}" vẫn bị vô hiệu hóa. Vẫn thử click...`);
      }

      let clicked = false;
      try {
        await button.click({ timeout: 5000 });
        clicked = true;
        console.log(`[Job ${job.id}] Click "${labelName}" thành công (normal click).`);
      } catch {
        try {
          await button.click({ force: true, timeout: 5000 });
          clicked = true;
          console.log(`[Job ${job.id}] Click "${labelName}" thành công (force click).`);
        } catch {
          try {
            await button.evaluate((el: HTMLElement) => el.click());
            clicked = true;
            console.log(`[Job ${job.id}] Click "${labelName}" thành công (JS click).`);
          } catch (e: any) {
            console.error(`[Job ${job.id}] Click "${labelName}" thất bại: ${e.message}`);
          }
        }
      }
      return clicked;
    };

    // Try step 1 (Tiếp/Next)
    const clickedStep1 = await clickButton(step1Selectors, 'Tiếp/Next');
    if (clickedStep1) {
      console.log(`[Job ${job.id}] Đã bấm nút bước 1. Đang đợi giao diện chuyển sang màn tiếp theo...`);
      await page.waitForTimeout(3000);
    }

    // Now click the final post button
    const clickedFinal = await clickButton(finalSelectors, 'Đăng/Post/Chia sẻ');
    if (!clickedFinal) {
      throw new Error('Không click được nút gửi bài đăng cuối cùng.');
    }

    // Wait for the modal to close and posting to finish
    await page.waitForSelector('div[role="dialog"]', { state: 'detached', timeout: 30000 });
    console.log(`[Job ${job.id}] Đã đăng bài thành công lên Facebook.`);

    await page.waitForTimeout(5000);
    
    let facebookPostId = `fb_post_${Date.now()}`; // fallback
    try {
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map(a => a.href)
          .filter(href => href.includes('/posts/') || href.includes('/permalink.php') || href.includes('/videos/'));
      });
      
      if (links.length > 0) {
        const topLink = links[0];
        const match = topLink.match(/\/posts\/([a-zA-Z0-9_]+)/);
        if (match && match[1]) {
          facebookPostId = match[1];
        } else {
          const urlObj = new URL(topLink);
          const fbid = urlObj.searchParams.get('story_fbid');
          if (fbid) {
            facebookPostId = fbid;
          }
        }
        console.log(`[Job ${job.id}] Đã trích xuất được Post ID: ${facebookPostId}`);
      }
    } catch (e) {
      console.log(`[Job ${job.id}] Không trích xuất được Post ID thực tế. Sử dụng mã giả lập.`);
    }

    // 6. Write affiliate comment if there is an affiliate URL
    let facebookCommentId = undefined;
    if (job.affiliateUrl) {
      console.log(`[Job ${job.id}] Đang đăng bình luận chứa link tiếp thị liên kết...`);
      
      await page.goto(`https://www.facebook.com/${job.pageId}/posts/${facebookPostId}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      }).catch(() => {
        console.log(`[Job ${job.id}] Không vào được link post trực tiếp, thực hiện bình luận ở trang feed.`);
      });
      await page.waitForTimeout(3000);

      const commentInputSelectors = [
        'div[role="textbox"][aria-label="Viết bình luận..."]',
        'div[role="textbox"][aria-label="Write a comment..."]',
        'div[role="textbox"][aria-label="Viết bình luận bằng tên trang của bạn..."]',
        'div[role="textbox"][contenteditable="true"]'
      ];

      let commentBox = null;
      for (const selector of commentInputSelectors) {
        const loc = page.locator(selector).first();
        if (await loc.isVisible()) {
          commentBox = loc;
          break;
        }
      }

      if (commentBox) {
        await commentBox.focus();
        const commentMessage = `👇 Nhận ưu đãi sản phẩm tại đây: ${job.affiliateUrl}`;
        await commentBox.fill(commentMessage);
        await page.keyboard.press('Enter');
        console.log(`[Job ${job.id}] Đã gửi bình luận tiếp thị liên kết.`);
        await page.waitForTimeout(3000);
        facebookCommentId = `fb_comment_${Date.now()}`;
      } else {
        console.warn(`[Job ${job.id}] Không tìm thấy khung bình luận. Bỏ qua bước bình luận.`);
      }
    }

    // 7. Report success to backend
    await axios.post(`${BACKEND_URL}/api/worker/jobs/${job.id}/complete`, {
      facebookPostId,
      facebookCommentId
    });
    console.log(`[Job ${job.id}] Hoàn thành công việc thành công! Đã cập nhật trạng thái trên backend.`);

  } catch (error: any) {
    const errorMsg = error?.message || 'Lỗi không xác định';
    console.error(`[Job ${job.id}] Thất bại: ${errorMsg}`);

    // Take screenshot and dump page source on failure for debugging
    try {
      if (page) {
        const artifactDir = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\5c9bdf3c-f4c4-4f0d-ab37-c06d3982ad8c';
        const screenshotPath = path.join(artifactDir, `error_${job.id}.png`);
        const htmlPath = path.join(artifactDir, `error_${job.id}.html`);
        
        await page.screenshot({ path: screenshotPath });
        const htmlContent = await page.content();
        fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
        
        console.log(`[Job ${job.id}] Đã chụp ảnh màn hình lỗi tại: ${screenshotPath}`);
        console.log(`[Job ${job.id}] Đã lưu mã nguồn trang lỗi tại: ${htmlPath}`);
      }
    } catch (debugErr: any) {
      console.error(`[Job ${job.id}] Lỗi khi chụp màn hình/lưu HTML gỡ lỗi:`, debugErr.message);
    }
    
    try {
      await axios.post(`${BACKEND_URL}/api/worker/jobs/${job.id}/fail`, {
        errorMessage: errorMsg
      });
      console.log(`[Job ${job.id}] Đã báo cáo lỗi về backend.`);
    } catch (apiErr) {
      console.error(`[Job ${job.id}] Không thể báo cáo lỗi về backend:`, apiErr);
    }
  } finally {
    for (const file of tempFiles) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch (e) {}
    }
    
    if (context) {
      try {
        await context.close();
      } catch (e) {}
    }
    try {
      await browser.close();
    } catch (e) {}
  }
}

async function pollJobs() {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/worker/pending`);
    const pendingJobs = response.data;
    
    if (pendingJobs.length > 0) {
      console.log(`Phát hiện ${pendingJobs.length} công việc đang chờ xử lý.`);
      for (const job of pendingJobs) {
        await processJob(job);
      }
    }
  } catch (error: any) {
    console.error('Lỗi khi gọi API check pending jobs từ backend:', error.message);
  }
}

async function start() {
  console.log('=== Dragonacy Local Facebook Worker Started ===');
  console.log(`Backend API URL: ${BACKEND_URL}`);
  console.log(`Thời gian quét: mỗi ${POLL_INTERVAL / 1000} giây.`);
  console.log('Đang chạy quét các bài viết chờ đăng...');
  
  await pollJobs();
  setInterval(pollJobs, POLL_INTERVAL);
}

start();
