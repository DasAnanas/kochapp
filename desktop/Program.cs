/* Kochapp – Desktop-Hülle (Windows)
 *
 * Zeigt die App in einem eigenen Fenster über die in Windows eingebaute WebView2-Engine.
 * Es läuft kein Browser und kein lokaler Server. Die Oberfläche (HTML/CSS/JS) ist als Ressource
 * eingebettet; die drei WebView2-Bibliotheken von Microsoft liegen als normale Dateien neben der EXE
 * (siehe build.ps1). Sie werden bewusst nicht eingebettet: Eine EXE, die Programmbibliotheken aus sich
 * selbst entpackt und lädt, stuft Windows Defender als verdächtig ein.
 * Bestellungen an externe Shop-APIs sendet die Hülle selbst (ersetzt server.js, keine CORS-Probleme).
 *
 * Bauen: desktop\build.ps1
 *
 * Wie bei server.js lassen sich Ziel und Key per Umgebungsvariable festlegen:
 *   ORDER_API_URL, ORDER_API_KEY, ORDER_API_KEY_HEADER
 */
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace Kochapp
{
    static class Program
    {
        [DllImport("user32.dll")]
        static extern bool SetProcessDPIAware();

        [STAThread]
        static void Main()
        {
            SetProcessDPIAware();
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            // Häufigster Fehler: EXE direkt aus der ZIP-Vorschau gestartet, dann fehlen die Bibliotheken daneben
            string dir = AppDomain.CurrentDomain.BaseDirectory;
            foreach (string dll in new[] { "Microsoft.Web.WebView2.Core.dll", "Microsoft.Web.WebView2.WinForms.dll", "WebView2Loader.dll" })
            {
                if (File.Exists(Path.Combine(dir, dll))) continue;
                MessageBox.Show("Die Datei " + dll + " fehlt neben Kochapp.exe.\n\nBitte die ZIP-Datei zuerst vollständig entpacken " +
                    "(Rechtsklick > Alle extrahieren) und Kochapp.exe aus dem entpackten Ordner starten.",
                    "Kochapp", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }
            Run();
        }

        // eigene Methode, damit die WebView2-Typen erst nach der Prüfung oben geladen werden
        [MethodImpl(MethodImplOptions.NoInlining)]
        static void Run()
        {
            Application.Run(new MainForm());
        }

        /// <summary>Liest eine eingebettete Datei der Oberfläche (web/…); null, wenn es sie nicht gibt.</summary>
        internal static byte[] Resource(string name)
        {
            using (Stream s = Assembly.GetExecutingAssembly().GetManifestResourceStream(name))
            {
                if (s == null) return null;
                using (MemoryStream ms = new MemoryStream())
                {
                    s.CopyTo(ms);
                    return ms.ToArray();
                }
            }
        }
    }

    class MainForm : Form
    {
        const string Host = "kochapp.local";
        const string Origin = "https://" + Host;

        static readonly Dictionary<string, string> Types = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { ".html", "text/html; charset=utf-8" }, { ".js", "text/javascript; charset=utf-8" },
            { ".css", "text/css; charset=utf-8" }, { ".json", "application/json" },
            { ".png", "image/png" }, { ".jpg", "image/jpeg" }, { ".svg", "image/svg+xml" }, { ".ico", "image/x-icon" },
        };

        readonly WebView2 view = new WebView2();
        readonly HttpClient http = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
        readonly JavaScriptSerializer json = new JavaScriptSerializer();

        public MainForm()
        {
            Text = "Kochapp";
            StartPosition = FormStartPosition.CenterScreen;
            Rectangle area = Screen.PrimaryScreen.WorkingArea;
            ClientSize = new Size(Math.Min(1360, area.Width - 80), Math.Min(900, area.Height - 80));
            MinimumSize = new Size(480, 400);
            try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch (Exception) { /* Standard-Symbol */ }
            view.Dock = DockStyle.Fill;
            Controls.Add(view);
            Load += OnLoad;
        }

        async void OnLoad(object sender, EventArgs e)
        {
            try
            {
                try { ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 | (SecurityProtocolType)12288; }
                catch (NotSupportedException) { ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12; }

                // Einstellungen, Vorrat und Wochenplan (localStorage) liegen im Benutzerprofil
                string data = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Kochapp");
                CoreWebView2Environment env = await CoreWebView2Environment.CreateAsync(null, data, null);
                await view.EnsureCoreWebView2Async(env);

                CoreWebView2 core = view.CoreWebView2;
                core.Settings.AreDevToolsEnabled = false;
                core.Settings.IsStatusBarEnabled = false;
                core.Settings.AreBrowserAcceleratorKeysEnabled = false;
                core.Settings.IsPasswordAutosaveEnabled = false;
                core.Settings.IsGeneralAutofillEnabled = false;

                core.AddWebResourceRequestedFilter(Origin + "/*", CoreWebView2WebResourceContext.All);
                core.WebResourceRequested += OnResource;
                core.NavigationStarting += OnNavigation;
                core.NewWindowRequested += OnNewWindow;
                core.DocumentTitleChanged += delegate { Text = string.IsNullOrEmpty(core.DocumentTitle) ? "Kochapp" : core.DocumentTitle; };
                await core.AddScriptToExecuteOnDocumentCreatedAsync("window.KA_DESKTOP = true;");

                core.Navigate(Origin + "/index.html");
            }
            catch (Exception ex)
            {
                MessageBox.Show(this, "Die Kochapp konnte nicht gestartet werden.\n\n" + ex.Message +
                    "\n\nBenötigt wird die Microsoft Edge WebView2-Laufzeit (in Windows 11 enthalten).",
                    "Kochapp", MessageBoxButtons.OK, MessageBoxIcon.Error);
                Close();
            }
        }

        // ---------- Navigation: nur die App selbst bleibt im Fenster ----------

        void OnNavigation(object sender, CoreWebView2NavigationStartingEventArgs e)
        {
            Uri uri;
            if (!Uri.TryCreate(e.Uri, UriKind.Absolute, out uri)) { e.Cancel = true; return; }
            if (uri.Scheme == "https" && uri.Host == Host) return;
            e.Cancel = true;
            OpenExternal(uri);
        }

        void OnNewWindow(object sender, CoreWebView2NewWindowRequestedEventArgs e)
        {
            e.Handled = true;
            Uri uri;
            if (Uri.TryCreate(e.Uri, UriKind.Absolute, out uri)) OpenExternal(uri);
        }

        /// <summary>Öffnet Web-Links und mailto: im Standardprogramm des Systems.</summary>
        static void OpenExternal(Uri uri)
        {
            if (uri.Scheme != "http" && uri.Scheme != "https" && uri.Scheme != "mailto") return;
            try { Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true }); }
            catch (Exception) { /* kein Standardprogramm eingerichtet */ }
        }

        // ---------- Anfragen der App: Dateien ausliefern, Bestellungen weiterleiten ----------

        async void OnResource(object sender, CoreWebView2WebResourceRequestedEventArgs e)
        {
            Uri uri = new Uri(e.Request.Uri);
            if (uri.AbsolutePath != "/api/order") { e.Response = ServeFile(uri); return; }

            if (e.Request.Method != "POST") { e.Response = Error(405, "Methode nicht erlaubt"); return; }
            string body = ReadAll(e.Request.Content);
            CoreWebView2Deferral deferral = e.GetDeferral();
            CoreWebView2WebResourceResponse response;
            try { response = await ForwardOrder(body); }
            catch (Exception ex) { response = Error(502, "Ziel nicht erreichbar: " + Innermost(ex).Message); }
            e.Response = response;
            deferral.Complete();
        }

        CoreWebView2WebResourceResponse ServeFile(Uri uri)
        {
            string rel = Uri.UnescapeDataString(uri.AbsolutePath).TrimStart('/');
            if (rel.Length == 0) rel = "index.html";
            string type;
            byte[] bytes = Types.TryGetValue(Path.GetExtension(rel), out type) ? Program.Resource("web/" + rel) : null;
            if (bytes == null) return Plain(404, "Not Found", "Nicht gefunden", "text/plain; charset=utf-8");
            return Respond(200, "OK", bytes, type);
        }

        /// <summary>Erwartet { target, method, headers, payload } und sendet payload als JSON an target.</summary>
        async Task<CoreWebView2WebResourceResponse> ForwardOrder(string body)
        {
            Dictionary<string, object> data;
            try { data = json.Deserialize<Dictionary<string, object>>(body); }
            catch (Exception) { data = null; }
            if (data == null) return Error(400, "Ungültiges JSON");

            string envUrl = Environment.GetEnvironmentVariable("ORDER_API_URL");
            bool fixedTarget = !string.IsNullOrEmpty(envUrl);
            string target = fixedTarget ? envUrl : Get(data, "target") as string;
            Uri targetUri;
            if (!Uri.TryCreate(target, UriKind.Absolute, out targetUri) || (targetUri.Scheme != "http" && targetUri.Scheme != "https"))
                return Error(400, "Ungültige Ziel-URL");

            HttpMethod method = "PUT".Equals(Get(data, "method") as string) ? HttpMethod.Put : HttpMethod.Post;
            using (HttpRequestMessage req = new HttpRequestMessage(method, targetUri))
            {
                req.Content = new StringContent(json.Serialize(Get(data, "payload")), Encoding.UTF8, "application/json");
                Dictionary<string, object> headers = Get(data, "headers") as Dictionary<string, object>;
                if (!fixedTarget && headers != null)
                    foreach (KeyValuePair<string, object> h in headers) AddHeader(req, h.Key, Convert.ToString(h.Value));
                string key = Environment.GetEnvironmentVariable("ORDER_API_KEY");
                if (!string.IsNullOrEmpty(key))
                    AddHeader(req, Environment.GetEnvironmentVariable("ORDER_API_KEY_HEADER") ?? "Authorization", key);

                using (HttpResponseMessage res = await http.SendAsync(req))
                {
                    byte[] bytes = await res.Content.ReadAsByteArrayAsync();
                    string type = res.Content.Headers.ContentType != null ? res.Content.Headers.ContentType.ToString() : "text/plain; charset=utf-8";
                    return Respond((int)res.StatusCode, string.IsNullOrEmpty(res.ReasonPhrase) ? "OK" : res.ReasonPhrase, bytes, type);
                }
            }
        }

        static void AddHeader(HttpRequestMessage req, string name, string value)
        {
            if (string.IsNullOrWhiteSpace(name) || name.Equals("Content-Type", StringComparison.OrdinalIgnoreCase)) return;
            if (value.IndexOf('\r') >= 0 || value.IndexOf('\n') >= 0) return;
            req.Headers.Remove(name);
            req.Headers.TryAddWithoutValidation(name, value);
        }

        // ---------- Hilfen ----------

        static object Get(Dictionary<string, object> d, string key)
        {
            object v;
            return d.TryGetValue(key, out v) ? v : null;
        }

        static string ReadAll(Stream s)
        {
            if (s == null) return "";
            using (MemoryStream ms = new MemoryStream())
            {
                s.CopyTo(ms);
                return Encoding.UTF8.GetString(ms.ToArray());
            }
        }

        static Exception Innermost(Exception ex)
        {
            while (ex.InnerException != null) ex = ex.InnerException;
            return ex;
        }

        CoreWebView2WebResourceResponse Respond(int status, string reason, byte[] bytes, string type)
        {
            return view.CoreWebView2.Environment.CreateWebResourceResponse(new MemoryStream(bytes), status, reason,
                "Content-Type: " + type + "\nCache-Control: no-store");
        }

        CoreWebView2WebResourceResponse Plain(int status, string reason, string text, string type)
        {
            return Respond(status, reason, Encoding.UTF8.GetBytes(text), type);
        }

        CoreWebView2WebResourceResponse Error(int status, string message)
        {
            return Plain(status, "Error", json.Serialize(new Dictionary<string, object> { { "error", message } }), "application/json");
        }
    }
}
