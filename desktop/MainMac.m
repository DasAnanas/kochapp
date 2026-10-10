#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>

@interface Kochapp : NSObject <NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate>
@property NSWindow *window;
@property WKWebView *web;
@end
@implementation Kochapp
- (void)applicationDidFinishLaunching:(NSNotification *)note {
    NSMenu *menu = [NSMenu new];
    NSMenuItem *appItem = [NSMenuItem new]; [menu addItem:appItem];
    NSMenu *appMenu = [NSMenu new];
    [appMenu addItemWithTitle:@"dAIlykitchen beenden" action:@selector(terminate:) keyEquivalent:@"q"];
    appItem.submenu = appMenu;
    NSMenuItem *editItem = [NSMenuItem new]; [menu addItem:editItem];
    NSMenu *editMenu = [[NSMenu alloc] initWithTitle:@"Bearbeiten"];
    NSArray *items = @[@[@"Widerrufen", @"undo:", @"z"], @[@"Ausschneiden", @"cut:", @"x"], @[@"Kopieren", @"copy:", @"c"], @[@"Einfügen", @"paste:", @"v"], @[@"Alles auswählen", @"selectAll:", @"a"]];
    for (NSArray *item in items) [editMenu addItemWithTitle:item[0] action:NSSelectorFromString(item[1]) keyEquivalent:item[2]];
    editItem.submenu = editMenu; NSApp.mainMenu = menu;
    WKWebViewConfiguration *config = [WKWebViewConfiguration new];
    config.websiteDataStore = WKWebsiteDataStore.defaultDataStore;
    self.web = [[WKWebView alloc] initWithFrame:NSZeroRect configuration:config];
    self.web.navigationDelegate = self; self.web.UIDelegate = self;
    self.window = [[NSWindow alloc] initWithContentRect:NSMakeRect(0,0,1200,800) styleMask:NSWindowStyleMaskTitled|NSWindowStyleMaskClosable|NSWindowStyleMaskMiniaturizable|NSWindowStyleMaskResizable backing:NSBackingStoreBuffered defer:NO];
    self.window.title = @"dAIlykitchen"; self.window.minSize = NSMakeSize(480,400);
    self.window.contentView = self.web; [self.window center]; [self.window makeKeyAndOrderFront:nil];
    [NSApp activateIgnoringOtherApps:YES];
    NSURL *page = [NSBundle.mainBundle URLForResource:@"index" withExtension:@"html" subdirectory:@"web"];
    if (page) [self.web loadFileURL:page allowingReadAccessToURL:page.URLByDeletingLastPathComponent];
}
- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)sender { return YES; }
- (BOOL)isExternal:(NSURL *)url { return [@[@"https", @"http", @"mailto"] containsObject:url.scheme.lowercaseString]; }
- (void)webView:(WKWebView *)web decidePolicyForNavigationAction:(WKNavigationAction *)action decisionHandler:(void (^)(WKNavigationActionPolicy))handler {
    NSURL *url = action.request.URL;
    if (action.shouldPerformDownload) { handler(WKNavigationActionPolicyDownload); return; }
    if ([self isExternal:url]) { [NSWorkspace.sharedWorkspace openURL:url]; handler(WKNavigationActionPolicyCancel); return; }
    handler((url.isFileURL || [url.scheme isEqual:@"blob"] || [url.absoluteString isEqual:@"about:blank"]) ? WKNavigationActionPolicyAllow : WKNavigationActionPolicyCancel);
}
- (WKWebView *)webView:(WKWebView *)web createWebViewWithConfiguration:(WKWebViewConfiguration *)config forNavigationAction:(WKNavigationAction *)action windowFeatures:(WKWindowFeatures *)features {
    if ([self isExternal:action.request.URL]) [NSWorkspace.sharedWorkspace openURL:action.request.URL]; return nil;
}
- (void)webView:(WKWebView *)web runOpenPanelWithParameters:(WKOpenPanelParameters *)parameters initiatedByFrame:(WKFrameInfo *)frame completionHandler:(void (^)(NSArray<NSURL *> *))handler {
    NSOpenPanel *panel = [NSOpenPanel openPanel]; panel.allowsMultipleSelection = parameters.allowsMultipleSelection;
    panel.canChooseDirectories = parameters.allowsDirectories;
    [panel beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse result) { handler(result == NSModalResponseOK ? panel.URLs : nil); }];
}
- (void)webView:(WKWebView *)web runJavaScriptAlertPanelWithMessage:(NSString *)message initiatedByFrame:(WKFrameInfo *)frame completionHandler:(void (^)(void))handler {
    NSAlert *alert = [NSAlert new]; alert.messageText = message;
    [alert beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse result) { handler(); }];
}
- (void)webView:(WKWebView *)web runJavaScriptConfirmPanelWithMessage:(NSString *)message initiatedByFrame:(WKFrameInfo *)frame completionHandler:(void (^)(BOOL))handler {
    NSAlert *alert = [NSAlert new]; alert.messageText = message; [alert addButtonWithTitle:@"OK"]; [alert addButtonWithTitle:@"Abbrechen"];
    [alert beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse result) { handler(result == NSAlertFirstButtonReturn); }];
}
- (void)webView:(WKWebView *)web printFrame:(WKFrameInfo *)frame {
    NSPrintOperation *op = [web printOperationWithPrintInfo:NSPrintInfo.sharedPrintInfo];
    [op runOperationModalForWindow:self.window delegate:nil didRunSelector:NULL contextInfo:NULL];
}
- (void)webView:(WKWebView *)web navigationAction:(WKNavigationAction *)action didBecomeDownload:(WKDownload *)download { download.delegate = self; }
- (void)webView:(WKWebView *)web navigationResponse:(WKNavigationResponse *)response didBecomeDownload:(WKDownload *)download { download.delegate = self; }
- (void)download:(WKDownload *)download decideDestinationUsingResponse:(NSURLResponse *)response suggestedFilename:(NSString *)filename completionHandler:(void (^)(NSURL *))handler {
    NSSavePanel *panel = [NSSavePanel savePanel]; panel.nameFieldStringValue = filename;
    [panel beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse result) { handler(result == NSModalResponseOK ? panel.URL : nil); }];
}
- (void)download:(WKDownload *)download didFailWithError:(NSError *)error resumeData:(NSData *)data {
    [[NSAlert alertWithError:error] beginSheetModalForWindow:self.window completionHandler:nil];
}
@end
int main(int argc, const char *argv[]) {
    @autoreleasepool {
        NSApplication *app = NSApplication.sharedApplication;
        Kochapp *delegate = [Kochapp new]; app.delegate = delegate;
        [app setActivationPolicy:NSApplicationActivationPolicyRegular]; [app run];
    }
    return 0;
}
