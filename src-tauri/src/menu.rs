use tauri::menu::{
    AboutMetadata, CheckMenuItem, CheckMenuItemBuilder, Menu, MenuBuilder, MenuItemBuilder,
    SubmenuBuilder,
};
use tauri::{AppHandle, Runtime};

pub fn build<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let default_markdown =
        MenuItemBuilder::with_id("default.markdown", "As Markdown Editor").build(app)?;
    let default_pdf =
        MenuItemBuilder::with_id("default.pdf", "As PDF Reader").build(app)?;
    let default_menu = SubmenuBuilder::new(app, "Set MDflow as Default")
        .items(&[&default_markdown, &default_pdf])
        .build()?;

    let app_menu = SubmenuBuilder::new(app, "MDflow")
        .about(Some(AboutMetadata {
            name: Some("MDflow".into()),
            version: Some(env!("CARGO_PKG_VERSION").into()),
            comments: Some("A fast, lightweight markdown editor".into()),
            ..Default::default()
        }))
        .separator()
        .item(&default_menu)
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    let new = MenuItemBuilder::with_id("file.new", "New File")
        .accelerator("CmdOrCtrl+N")
        .build(app)?;
    let open = MenuItemBuilder::with_id("file.open", "Open File…")
        .accelerator("CmdOrCtrl+O")
        .build(app)?;
    let open_folder = MenuItemBuilder::with_id("file.open_folder", "Open Folder…")
        .accelerator("CmdOrCtrl+Shift+O")
        .build(app)?;
    let save = MenuItemBuilder::with_id("file.save", "Save")
        .accelerator("CmdOrCtrl+S")
        .build(app)?;
    let save_as = MenuItemBuilder::with_id("file.save_as", "Save As…")
        .accelerator("CmdOrCtrl+Shift+S")
        .build(app)?;
    let close = MenuItemBuilder::with_id("file.close", "Close Tab")
        .accelerator("CmdOrCtrl+W")
        .build(app)?;
    let export_md_pdf =
        MenuItemBuilder::with_id("export.md.pdf", "PDF…").build(app)?;
    let export_md_docx =
        MenuItemBuilder::with_id("export.md.docx", "Word (DOCX)…").build(app)?;
    let export_markdown = SubmenuBuilder::new(app, "Markdown")
        .items(&[&export_md_pdf, &export_md_docx])
        .build()?;
    let export_html_png =
        MenuItemBuilder::with_id("export.html.png", "PNG Image…").build(app)?;
    let export_html_jpg =
        MenuItemBuilder::with_id("export.html.jpg", "JPG Image…").build(app)?;
    let export_html_pdf =
        MenuItemBuilder::with_id("export.html.pdf", "PDF…").build(app)?;
    let export_html = SubmenuBuilder::new(app, "HTML")
        .items(&[&export_html_png, &export_html_jpg, &export_html_pdf])
        .build()?;
    let export = SubmenuBuilder::new(app, "Export")
        .item(&export_html)
        .item(&export_markdown)
        .build()?;
    let file_menu = SubmenuBuilder::new(app, "File")
        .item(&new)
        .separator()
        .item(&open)
        .item(&open_folder)
        .separator()
        .item(&save)
        .item(&save_as)
        .item(&export)
        .separator()
        .item(&close)
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let split = MenuItemBuilder::with_id("view.split", "Split")
        .accelerator("CmdOrCtrl+B")
        .build(app)?;
    let editor = MenuItemBuilder::with_id("view.editor", "Editor")
        .accelerator("CmdOrCtrl+E")
        .build(app)?;
    let read = MenuItemBuilder::with_id("view.read", "Read").build(app)?;
    let soft = CheckMenuItemBuilder::with_id("view.softwrap", "Soft Wrap")
        .checked(true)
        .build(app)?;
    let view_menu = SubmenuBuilder::new(app, "View")
        .item(&split)
        .item(&editor)
        .item(&read)
        .separator()
        .item(&soft)
        .build()?;

    let window_menu = SubmenuBuilder::new(app, "Window").minimize().build()?;

    let help = MenuItemBuilder::with_id("help.guide", "MDflow Help").build(app)?;
    let check_updates =
        MenuItemBuilder::with_id("help.check_updates", "Check for Updates…").build(app)?;
    let help_menu = SubmenuBuilder::new(app, "Help")
        .item(&help)
        .separator()
        .item(&check_updates)
        .build()?;

    MenuBuilder::new(app)
        .items(&[
            &app_menu,
            &file_menu,
            &edit_menu,
            &view_menu,
            &window_menu,
            &help_menu,
        ])
        .build()
}

/// Find the "Soft Wrap" check item by walking the submenus.
pub fn soft_wrap_item<R: Runtime>(app: &AppHandle<R>) -> Option<CheckMenuItem<R>> {
    let menu = app.menu()?;
    for kind in menu.items().ok()? {
        if let Some(sub) = kind.as_submenu() {
            if let Some(item) = sub.get("view.softwrap") {
                return item.as_check_menuitem().cloned();
            }
        }
    }
    None
}
