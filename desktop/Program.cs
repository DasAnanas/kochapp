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
using System.Net.Sockets;
using System.Text.RegularExpressions;
using System.Threading;
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
            { ".html", "text/html; charset=utf-8" }, { ".js", "text/javascript; charset=utf-8" }, { ".mjs", "text/javascript; charset=utf-8" },
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
                // (KOCHAPP_DATA legt einen anderen Ordner fest, z. B. für Tests neben einer laufenden App)
                string data = Environment.GetEnvironmentVariable("KOCHAPP_DATA");
                if (string.IsNullOrEmpty(data)) data = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Kochapp");
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
            bool rewe = uri.AbsolutePath.StartsWith(RewePrefix + "/", StringComparison.Ordinal);
            bool food = uri.AbsolutePath == "/api/foodsearch";
            bool page = uri.AbsolutePath == "/api/fetch-page";
            if (uri.AbsolutePath != "/api/order" && !rewe && !food && !page) { e.Response = ServeFile(uri); return; }

            string method = e.Request.Method;
            if (food ? method != "GET" : method != "POST" && !(rewe && method == "GET")) { e.Response = Error(405, "Methode nicht erlaubt"); return; }
            string body = ReadAll(e.Request.Content);
            CoreWebView2Deferral deferral = e.GetDeferral();
            CoreWebView2WebResourceResponse response;
            try { response = page ? await FetchPage(body) : food ? await SearchFood(uri) : rewe ? await ForwardRewe(uri, method, body) : await ForwardOrder(body); }
            catch (Exception ex) { response = Error(502, (page ? "Seite nicht erreichbar: " : food ? "Suche nicht erreichbar: " : rewe ? "REWE-Bridge nicht erreichbar: " : "Ziel nicht erreichbar: ") + Innermost(ex).Message); }
            e.Response = response;
            deferral.Complete();
        }

        // ---------- Linkimport: öffentliche Rezeptseite abrufen (ausgewertet wird sie in der Oberfläche, import-recipe.mjs) ----------

        const int MaxPage = 3 * 1024 * 1024;
        class ImportException : Exception { public ImportException(string message) : base(message) { } }
        readonly HttpClient pageHttp = new HttpClient(new HttpClientHandler
        {
            AllowAutoRedirect = false, // Weiterleitungen einzeln prüfen (siehe PublicUrl)
            AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate,
        });

        /// <summary>
        /// Lässt nur Adressen öffentlicher Websites zu – entspricht publicURL() in import-recipe.mjs und prüft zusätzlich,
        /// dass der Name nicht auf diesen Rechner oder ins lokale Netz zeigt.
        /// </summary>
        static async Task<Uri> PublicUrl(string value)
        {
            Uri url;
            if (!Uri.TryCreate(value, UriKind.Absolute, out url) || (url.Scheme != "http" && url.Scheme != "https"))
                throw new ImportException("Bitte einen vollständigen https://-Link eingeben.");
            string host = url.Host.ToLowerInvariant();
            if (url.UserInfo.Length > 0 || !url.IsDefaultPort || url.HostNameType != UriHostNameType.Dns || !host.Contains(".") ||
                Regex.IsMatch(host, @"^[\d.]+$") || Regex.IsMatch(host, @"(^|\.)(localhost|local|internal|test|invalid|onion|home|lan)$"))
                throw new ImportException("Bitte einen Link zu einer öffentlichen Rezeptwebsite verwenden.");
            IPAddress[] addresses;
            try { addresses = await Dns.GetHostAddressesAsync(host); }
            catch (Exception) { throw new ImportException("Die Website konnte nicht erreicht werden. Bitte den Link prüfen."); }
            foreach (IPAddress a in addresses)
            {
                IPAddress ip = a.IsIPv4MappedToIPv6 ? a.MapToIPv4() : a;
                byte[] b = ip.GetAddressBytes();
                bool local = IPAddress.IsLoopback(ip) || ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal ||
                    (ip.AddressFamily == AddressFamily.InterNetworkV6 && (b[0] & 0xFE) == 0xFC) ||
                    (ip.AddressFamily == AddressFamily.InterNetwork && (b[0] == 0 || b[0] == 10 || b[0] == 127 || (b[0] == 169 && b[1] == 254) ||
                        (b[0] == 172 && b[1] >= 16 && b[1] <= 31) || (b[0] == 192 && b[1] == 168) || (b[0] == 100 && b[1] >= 64 && b[1] <= 127)));
                if (local) throw new ImportException("Bitte einen Link zu einer öffentlichen Rezeptwebsite verwenden.");
            }
            return new UriBuilder(url) { Fragment = "" }.Uri;
        }

        /// <summary>POST /api/fetch-page { url } liefert das HTML der Seite (höchstens 3 MB, UTF-8); die endgültige Adresse steht im Kopf X-Final-Url.</summary>
        async Task<CoreWebView2WebResourceResponse> FetchPage(string body)
        {
            Dictionary<string, object> data = null;
            try { data = json.Deserialize<Dictionary<string, object>>(body); } catch (Exception) { /* unten als Fehler behandelt */ }
            string value = data == null ? null : Get(data, "url") as string;
            if (string.IsNullOrEmpty(value) || value.Length > 2000) return Error(400, "Bitte einen Rezeptlink eingeben.");
            try
            {
                Uri url = await PublicUrl(value);
                using (CancellationTokenSource cts = new CancellationTokenSource(TimeSpan.FromSeconds(18)))
                {
                    for (int redirects = 0; redirects <= 4; redirects++)
                    {
                        using (HttpRequestMessage req = new HttpRequestMessage(HttpMethod.Get, url))
                        {
                            req.Headers.TryAddWithoutValidation("Accept", "text/html,application/xhtml+xml");
                            req.Headers.TryAddWithoutValidation("User-Agent", "KochappRecipeImporter/1.0");
                            using (HttpResponseMessage res = await pageHttp.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, cts.Token))
                            {
                                int code = (int)res.StatusCode;
                                if (code == 301 || code == 302 || code == 303 || code == 307 || code == 308)
                                {
                                    if (res.Headers.Location == null) throw new ImportException("Die Website liefert eine ungültige Weiterleitung.");
                                    url = await PublicUrl(new Uri(url, res.Headers.Location).AbsoluteUri);
                                    continue;
                                }
                                if (!res.IsSuccessStatusCode)
                                    throw new ImportException("Die Website erlaubt den Abruf nicht (HTTP " + code + "). Bitte einen anderen Link versuchen oder das Rezept manuell eintragen.");
                                var type = res.Content.Headers.ContentType;
                                string media = type == null ? "" : (type.MediaType ?? "").ToLowerInvariant();
                                if (media != "text/html" && media != "application/xhtml+xml") throw new ImportException("Der Link führt nicht zu einer Rezept-Webseite.");
                                if (res.Content.Headers.ContentLength > MaxPage) throw new ImportException("Die Rezeptseite ist zu groß für den Import.");
                                byte[] bytes;
                                using (Stream s = await res.Content.ReadAsStreamAsync())
                                using (MemoryStream ms = new MemoryStream())
                                {
                                    byte[] buf = new byte[81920];
                                    int n;
                                    while ((n = await s.ReadAsync(buf, 0, buf.Length, cts.Token)) > 0)
                                    {
                                        ms.Write(buf, 0, n);
                                        if (ms.Length > MaxPage) throw new ImportException("Die Rezeptseite ist zu groß für den Import.");
                                    }
                                    bytes = ms.ToArray();
                                }
                                Encoding enc = Encoding.UTF8;
                                try { if (!string.IsNullOrEmpty(type.CharSet)) enc = Encoding.GetEncoding(type.CharSet.Trim('"')); } catch (ArgumentException) { /* unbekannter Zeichensatz: UTF-8 */ }
                                if (enc.CodePage != Encoding.UTF8.CodePage) bytes = Encoding.UTF8.GetBytes(enc.GetString(bytes));
                                return Respond(200, "OK", bytes, "text/html; charset=utf-8", "X-Final-Url: " + url.AbsoluteUri);
                            }
                        }
                    }
                    throw new ImportException("Die Website leitet zu oft weiter.");
                }
            }
            catch (ImportException ex) { return Error(422, ex.Message); }
            catch (OperationCanceledException) { return Error(422, "Die Website antwortet zu langsam. Bitte später erneut versuchen."); }
            catch (HttpRequestException) { return Error(422, "Die Website konnte nicht erreicht werden. Bitte später erneut versuchen oder einen anderen Rezeptlink verwenden."); }
        }

        // ---------- Nährwertsuche bei Open Food Facts (für eigene Lebensmittel) ----------

        /// <summary>
        /// GET /api/foodsearch?q=… fragt die Produktsuche von Open Food Facts ab und weicht bei Überlast auf deren
        /// zweiten Suchdienst aus. Übertragen wird nur der Suchbegriff. Die Antwort (JSON) geht unverändert zurück.
        /// </summary>
        async Task<CoreWebView2WebResourceResponse> SearchFood(Uri uri)
        {
            string q = "";
            foreach (string part in uri.Query.TrimStart('?').Split('&'))
                if (part.StartsWith("q=", StringComparison.Ordinal)) q = Uri.UnescapeDataString(part.Substring(2).Replace('+', ' ')).Trim();
            if (q.Length == 0 || q.Length > 80) return Error(400, "Suchbegriff fehlt");
            string term = Uri.EscapeDataString(q);
            string[] urls =
            {
                "https://world.openfoodfacts.org/cgi/search.pl?search_terms=" + term + "&search_simple=1&action=process&json=1&page_size=24&lc=de&cc=de&fields=code,product_name,product_name_de,brands,nutriments",
                "https://search.openfoodfacts.org/search?q=" + term + "&langs=de&page_size=24&fields=code,product_name,brands,nutriments",
            };
            string last = "keine Antwort";
            foreach (string url in urls)
            {
                try
                {
                    using (HttpRequestMessage req = new HttpRequestMessage(HttpMethod.Get, url))
                    {
                        req.Headers.TryAddWithoutValidation("User-Agent", "Kochapp/1.2 (https://github.com/DasAnanas/kochapp)");
                        using (HttpResponseMessage res = await http.SendAsync(req))
                        {
                            if (res.IsSuccessStatusCode) return Respond(200, "OK", await res.Content.ReadAsByteArrayAsync(), "application/json; charset=utf-8");
                            last = "HTTP " + (int)res.StatusCode;
                        }
                    }
                }
                catch (Exception ex) { last = Innermost(ex).Message; }
            }
            return Error(502, "Open Food Facts antwortet nicht (" + last + ")");
        }

        // ---------- REWE-Bridge (rewe-bridge\ neben der EXE): lokale API, die den Warenkorb auf rewe.de füllt ----------

        const string RewePrefix = "/api/rewe";
        // Standardadresse der Bridge; REWE_BRIDGE_URL überschreibt sie (z. B. wenn die Bridge mit -Port gestartet wird)
        static readonly string ReweBridge = (Environment.GetEnvironmentVariable("REWE_BRIDGE_URL") ?? "http://localhost:8765").TrimEnd('/');

        string ReweDir { get { return Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "rewe-bridge"); } }

        /// <summary>
        /// Reicht /api/rewe/… an die Bridge weiter und setzt deren API-Schlüssel (aus rewe-bridge\.data\token.txt) –
        /// so muss ihn niemand abtippen. POST /api/rewe/start startet die Bridge (start-rewe-bridge.cmd) im Hintergrund:
        /// ohne Konsolenfenster, das REWE-Browserfenster bleibt verborgen, bis der Warenkorb fertig ist. Die Bridge
        /// beendet sich selbst, sobald die Kochapp geschlossen wird (-ParentPid); ihr Protokoll steht in
        /// rewe-bridge\.data\bridge.log. Mit KOCHAPP_REWE_VISIBLE=1 läuft alles sichtbar (zur Fehlersuche).
        /// </summary>
        async Task<CoreWebView2WebResourceResponse> ForwardRewe(Uri uri, string method, string body)
        {
            string path = uri.AbsolutePath.Substring(RewePrefix.Length);
            if (path == "/start")
            {
                string cmd = Path.Combine(ReweDir, "start-rewe-bridge.cmd");
                if (!File.Exists(cmd)) return Error(404, "Der Ordner rewe-bridge fehlt neben Kochapp.exe.");
                if (Environment.GetEnvironmentVariable("KOCHAPP_REWE_VISIBLE") == "1")
                    Process.Start(new ProcessStartInfo(cmd, "-Visible") { UseShellExecute = true, WorkingDirectory = ReweDir });
                else
                {
                    ProcessStartInfo psi = new ProcessStartInfo("cmd.exe", "/c \"\"" + cmd + "\" -ParentPid " + Process.GetCurrentProcess().Id + "\"")
                    {
                        UseShellExecute = false, CreateNoWindow = true, WorkingDirectory = ReweDir,
                    };
                    psi.EnvironmentVariables["KOCHAPP_BACKGROUND"] = "1"; // start-rewe-bridge.cmd wartet dann am Ende nicht auf eine Taste
                    Process.Start(psi);
                }
                return Plain(202, "Accepted", "{\"started\":true}", "application/json");
            }
            using (HttpRequestMessage req = new HttpRequestMessage(method == "GET" ? HttpMethod.Get : HttpMethod.Post, ReweBridge + path + uri.Query))
            {
                string token = Path.Combine(ReweDir, ".data", "token.txt");
                if (File.Exists(token)) req.Headers.TryAddWithoutValidation("Authorization", "Bearer " + File.ReadAllText(token).Trim());
                if (method == "POST") req.Content = new StringContent(body, Encoding.UTF8, "application/json");
                using (HttpResponseMessage res = await http.SendAsync(req))
                {
                    byte[] bytes = await res.Content.ReadAsByteArrayAsync();
                    return Respond((int)res.StatusCode, string.IsNullOrEmpty(res.ReasonPhrase) ? "OK" : res.ReasonPhrase, bytes, "application/json; charset=utf-8");
                }
            }
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

        CoreWebView2WebResourceResponse Respond(int status, string reason, byte[] bytes, string type, string extraHeader = null)
        {
            return view.CoreWebView2.Environment.CreateWebResourceResponse(new MemoryStream(bytes), status, reason,
                "Content-Type: " + type + "\nCache-Control: no-store" + (extraHeader == null ? "" : "\n" + extraHeader));
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
