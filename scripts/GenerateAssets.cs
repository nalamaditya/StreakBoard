using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;
using System.IO;

public class AssetGenerator
{
    public static void GenerateIcon(int size, string outputPath, bool transparentBg)
    {
        using (Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb))
        using (Graphics g = Graphics.FromImage(bmp))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;

            if (!transparentBg)
            {
                Rectangle rect = new Rectangle(0, 0, size, size);
                using (LinearGradientBrush bgBrush = new LinearGradientBrush(rect,
                    ColorTranslator.FromHtml("#161922"),
                    ColorTranslator.FromHtml("#0D0F14"),
                    45.0f))
                {
                    g.FillRectangle(bgBrush, rect);
                }

                // Ambient center glow
                using (GraphicsPath glowPath = new GraphicsPath())
                {
                    float glowSize = size * 0.85f;
                    glowPath.AddEllipse((size - glowSize) / 2f, (size - glowSize) / 2f, glowSize, glowSize);
                    using (PathGradientBrush pbr = new PathGradientBrush(glowPath))
                    {
                        pbr.CenterColor = Color.FromArgb(60, 99, 102, 241);
                        pbr.SurroundColors = new Color[] { Color.FromArgb(0, 13, 15, 20) };
                        g.FillEllipse(pbr, (size - glowSize) / 2f, (size - glowSize) / 2f, glowSize, glowSize);
                    }
                }
            }
            else
            {
                g.Clear(Color.Transparent);
            }

            float cx = size / 2.0f;
            float cy = size / 2.0f;

            // Outer ring: Indigo
            float r1 = size * 0.36f;
            float w1 = size * 0.052f;
            using (Pen trackPen1 = new Pen(Color.FromArgb(40, 99, 102, 241), w1))
            {
                g.DrawEllipse(trackPen1, cx - r1, cy - r1, r1 * 2, r1 * 2);
            }
            using (Pen ringPen1 = new Pen(ColorTranslator.FromHtml("#6366F1"), w1))
            {
                ringPen1.StartCap = LineCap.Round;
                ringPen1.EndCap = LineCap.Round;
                g.DrawArc(ringPen1, cx - r1, cy - r1, r1 * 2, r1 * 2, -90, 280);
            }

            // Middle ring: Pink
            float r2 = size * 0.25f;
            float w2 = size * 0.048f;
            using (Pen trackPen2 = new Pen(Color.FromArgb(40, 236, 72, 153), w2))
            {
                g.DrawEllipse(trackPen2, cx - r2, cy - r2, r2 * 2, r2 * 2);
            }
            using (Pen ringPen2 = new Pen(ColorTranslator.FromHtml("#EC4899"), w2))
            {
                ringPen2.StartCap = LineCap.Round;
                ringPen2.EndCap = LineCap.Round;
                g.DrawArc(ringPen2, cx - r2, cy - r2, r2 * 2, r2 * 2, -90, 225);
            }

            // Inner ring: Mint
            float r3 = size * 0.155f;
            float w3 = size * 0.042f;
            using (Pen trackPen3 = new Pen(Color.FromArgb(40, 16, 185, 129), w3))
            {
                g.DrawEllipse(trackPen3, cx - r3, cy - r3, r3 * 2, r3 * 2);
            }
            using (Pen ringPen3 = new Pen(ColorTranslator.FromHtml("#10B981"), w3))
            {
                ringPen3.StartCap = LineCap.Round;
                ringPen3.EndCap = LineCap.Round;
                g.DrawArc(ringPen3, cx - r3, cy - r3, r3 * 2, r3 * 2, -90, 165);
            }

            // Center lightning bolt
            using (GraphicsPath boltPath = new GraphicsPath())
            {
                float s = size * 0.0016f;
                PointF[] pts = new PointF[]
                {
                    new PointF(cx + 4.5f * s, cy - 38f * s),
                    new PointF(cx - 28f * s, cy + 4f * s),
                    new PointF(cx - 4f * s, cy + 4f * s),
                    new PointF(cx - 10f * s, cy + 40f * s),
                    new PointF(cx + 28f * s, cy - 4f * s),
                    new PointF(cx + 4f * s, cy - 4f * s)
                };
                boltPath.AddPolygon(pts);

                RectangleF boltRect = new RectangleF(cx - 30f * s, cy - 40f * s, 60f * s, 80f * s);
                using (LinearGradientBrush boltBrush = new LinearGradientBrush(boltRect,
                    ColorTranslator.FromHtml("#FDE047"),
                    ColorTranslator.FromHtml("#F59E0B"),
                    90.0f))
                {
                    g.FillPath(boltBrush, boltPath);
                }

                using (Pen borderPen = new Pen(ColorTranslator.FromHtml("#FFFBEB"), Math.Max(1.5f, size * 0.005f)))
                {
                    g.DrawPath(borderPen, boltPath);
                }
            }

            string dir = Path.GetDirectoryName(outputPath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }
            bmp.Save(outputPath, ImageFormat.Png);
        }
    }

    public static void GenerateSplash(int width, int height, string outputPath)
    {
        using (Bitmap bmp = new Bitmap(width, height, PixelFormat.Format32bppArgb))
        using (Graphics g = Graphics.FromImage(bmp))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;

            // Background
            Rectangle rect = new Rectangle(0, 0, width, height);
            using (LinearGradientBrush bgBrush = new LinearGradientBrush(rect,
                ColorTranslator.FromHtml("#161922"),
                ColorTranslator.FromHtml("#0D0F14"),
                90.0f))
            {
                g.FillRectangle(bgBrush, rect);
            }

            // Glow
            using (GraphicsPath glowPath = new GraphicsPath())
            {
                float glowSize = width * 0.95f;
                glowPath.AddEllipse((width - glowSize) / 2f, height * 0.38f - glowSize / 2f, glowSize, glowSize);
                using (PathGradientBrush pbr = new PathGradientBrush(glowPath))
                {
                    pbr.CenterColor = Color.FromArgb(50, 99, 102, 241);
                    pbr.SurroundColors = new Color[] { Color.FromArgb(0, 13, 15, 20) };
                    g.FillEllipse(pbr, (width - glowSize) / 2f, height * 0.38f - glowSize / 2f, glowSize, glowSize);
                }
            }

            // Render center icon in memory
            int iconSize = (int)(width * 0.44f);
            using (Bitmap iconBmp = new Bitmap(iconSize, iconSize, PixelFormat.Format32bppArgb))
            {
                string tempIcon = Path.Combine(Path.GetTempPath(), "sb_icon_temp.png");
                GenerateIcon(iconSize, tempIcon, true);
                using (Image loaded = Image.FromFile(tempIcon))
                {
                    float ix = (width - iconSize) / 2f;
                    float iy = height * 0.35f - iconSize / 2f;
                    g.DrawImage(loaded, ix, iy, iconSize, iconSize);
                }
                try { File.Delete(tempIcon); } catch {}
            }

            // Typography
            using (FontFamily ff = new FontFamily("Segoe UI"))
            using (Font titleFont = new Font(ff, 58, FontStyle.Bold, GraphicsUnit.Pixel))
            using (Font subFont = new Font(ff, 26, FontStyle.Regular, GraphicsUnit.Pixel))
            using (Font footFont = new Font(ff, 22, FontStyle.Regular, GraphicsUnit.Pixel))
            {
                string title = "StreakBoard";
                SizeF titleSize = g.MeasureString(title, titleFont);
                float tx = (width - titleSize.Width) / 2f;
                float ty = height * 0.35f + (iconSize / 2f) + 40;

                using (SolidBrush b = new SolidBrush(ColorTranslator.FromHtml("#F2F4F8")))
                {
                    g.DrawString(title, titleFont, b, tx, ty);
                }

                string sub = "Gamified Habit Tracker & Daily Board";
                SizeF subSize = g.MeasureString(sub, subFont);
                float sx = (width - subSize.Width) / 2f;
                float sy = ty + titleSize.Height + 12;

                using (SolidBrush b = new SolidBrush(ColorTranslator.FromHtml("#94A3B8")))
                {
                    g.DrawString(sub, subFont, b, sx, sy);
                }

                string foot = "Web & Mobile • Supabase Cloud Sync";
                SizeF footSize = g.MeasureString(foot, footFont);
                float fx = (width - footSize.Width) / 2f;
                float fy = height - 140;

                using (SolidBrush b = new SolidBrush(ColorTranslator.FromHtml("#6366F1")))
                {
                    g.DrawString(foot, footFont, b, fx, fy);
                }
            }

            string dir = Path.GetDirectoryName(outputPath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }
            bmp.Save(outputPath, ImageFormat.Png);
        }
    }

    public static void GenerateBanner(int width, int height, string outputPath)
    {
        using (Bitmap bmp = new Bitmap(width, height, PixelFormat.Format32bppArgb))
        using (Graphics g = Graphics.FromImage(bmp))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;

            Rectangle rect = new Rectangle(0, 0, width, height);
            using (LinearGradientBrush bgBrush = new LinearGradientBrush(rect,
                ColorTranslator.FromHtml("#161922"),
                ColorTranslator.FromHtml("#0D0F14"),
                45.0f))
            {
                g.FillRectangle(bgBrush, rect);
            }

            // Center-left icon
            int iconSize = 340;
            string tempIcon = Path.Combine(Path.GetTempPath(), "sb_banner_temp.png");
            GenerateIcon(iconSize, tempIcon, true);
            using (Image loaded = Image.FromFile(tempIcon))
            {
                g.DrawImage(loaded, 90f, 145f, iconSize, iconSize);
            }
            try { File.Delete(tempIcon); } catch {}

            // Typography
            using (FontFamily ff = new FontFamily("Segoe UI"))
            using (Font titleFont = new Font(ff, 54, FontStyle.Bold, GraphicsUnit.Pixel))
            using (Font tagFont = new Font(ff, 23, FontStyle.Bold, GraphicsUnit.Pixel))
            using (Font descFont = new Font(ff, 18, FontStyle.Regular, GraphicsUnit.Pixel))
            using (Font pillFont = new Font(ff, 14, FontStyle.Bold, GraphicsUnit.Pixel))
            using (Font linkFont = new Font(ff, 15, FontStyle.Regular, GraphicsUnit.Pixel))
            {
                using (SolidBrush b = new SolidBrush(ColorTranslator.FromHtml("#FFFFFF")))
                {
                    g.DrawString("StreakBoard", titleFont, b, 480f, 130f);
                }

                using (SolidBrush b = new SolidBrush(ColorTranslator.FromHtml("#6366F1")))
                {
                    g.DrawString("Gamified Habit Tracking & Daily Productivity", tagFont, b, 482f, 205f);
                }

                using (SolidBrush b = new SolidBrush(ColorTranslator.FromHtml("#94A3B8")))
                {
                    g.DrawString("Cross-platform web app and native Android mobile app.\nMulti-device cloud sync with Supabase PostgreSQL & Auth.", descFont, b, 482f, 255f);
                }

                // Badges
                var pills = new[]
                {
                    new { Text = "Web App: streak-board-mauve.vercel.app", Color = "#3B82F6" },
                    new { Text = "Native Android App", Color = "#10B981" },
                    new { Text = "Supabase PostgreSQL & Auth", Color = "#EC4899" },
                    new { Text = "Gamified XP & Streaks", Color = "#F59E0B" }
                };

                float px = 482f;
                float py = 350f;
                foreach (var p in pills)
                {
                    SizeF sz = g.MeasureString(p.Text, pillFont);
                    float pw = sz.Width + 24f;
                    float ph = 34f;

                    if (px + pw > width - 50)
                    {
                        px = 482f;
                        py += 46f;
                    }

                    RectangleF pRect = new RectangleF(px, py, pw, ph);
                    using (GraphicsPath path = new GraphicsPath())
                    {
                        path.AddArc(px, py, ph, ph, 90, 180);
                        path.AddArc(px + pw - ph, py, ph, ph, 270, 180);
                        path.CloseFigure();

                        using (SolidBrush fill = new SolidBrush(Color.FromArgb(40, ColorTranslator.FromHtml(p.Color))))
                        {
                            g.FillPath(fill, path);
                        }
                        using (Pen pen = new Pen(ColorTranslator.FromHtml(p.Color), 1.5f))
                        {
                            g.DrawPath(pen, path);
                        }
                    }

                    using (SolidBrush textB = new SolidBrush(ColorTranslator.FromHtml("#F8FAFC")))
                    {
                        g.DrawString(p.Text, pillFont, textB, px + 12f, py + 7f);
                    }

                    px += pw + 12f;
                }

                using (SolidBrush b = new SolidBrush(ColorTranslator.FromHtml("#64748B")))
                {
                    g.DrawString("streak-board-mauve.vercel.app  •  github.com/nalamaditya/StreakBoard", linkFont, b, 482f, 470f);
                }
            }

            string dir = Path.GetDirectoryName(outputPath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }
            bmp.Save(outputPath, ImageFormat.Png);
        }
    }

    public static void RunAll()
    {
        Console.WriteLine("Generating mobile icons and splash...");
        GenerateIcon(1024, @"mobile\assets\icon.png", false);
        GenerateIcon(1024, @"mobile\assets\adaptive-icon.png", true);
        GenerateIcon(192, @"mobile\assets\favicon.png", false);
        GenerateSplash(1242, 2436, @"mobile\assets\splash.png");

        Console.WriteLine("Generating web icons and logos...");
        GenerateIcon(512, @"img\logo.png", false);
        GenerateIcon(192, @"img\icon-192.png", false);
        GenerateIcon(64, @"img\favicon.png", false);
        GenerateBanner(1200, 630, @"img\banner.png");

        Console.WriteLine("Generating root favicon...");
        GenerateIcon(48, @"favicon.png", false);

        Console.WriteLine("All brand and app assets created successfully!");
    }
}
