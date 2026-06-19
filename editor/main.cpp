#include <QAbstractItemView>
#include <QAction>
#include <QApplication>
#include <QCoreApplication>
#include <QDir>
#include <QFile>
#include <QFileDialog>
#include <QFileInfo>
#include <QFormLayout>
#include <QHeaderView>
#include <QHBoxLayout>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QLabel>
#include <QLineEdit>
#include <QMainWindow>
#include <QMessageBox>
#include <QProcess>
#include <QPushButton>
#include <QStatusBar>
#include <QTableWidget>
#include <QTabWidget>
#include <QTextEdit>
#include <QToolBar>
#include <QVBoxLayout>
#include <QWidget>

class SiteInfoEditor : public QMainWindow {
public:
  explicit SiteInfoEditor(QWidget *parent = nullptr) : QMainWindow(parent) {
    setWindowTitle(QStringLiteral("个人主页资料编辑器"));
    resize(1080, 780);
    buildUi();
  }

  void openFile(const QString &path) {
    QFile file(path);
    if (!file.open(QIODevice::ReadOnly)) {
      QMessageBox::warning(this, QStringLiteral("打开失败"), file.errorString());
      return;
    }

    const QJsonDocument doc = QJsonDocument::fromJson(file.readAll());
    if (!doc.isObject()) {
      QMessageBox::warning(this, QStringLiteral("格式错误"), QStringLiteral("这个文件不是 JSON 对象。"));
      return;
    }

    filePath_ = path;
    data_ = normalize(doc.object());
    loadToUi();
    statusBarMessage(QStringLiteral("已打开：") + path);
  }

  void openDefaultFile() {
    for (const auto &path : defaultDataFileCandidates()) {
      if (QFileInfo::exists(path)) {
        openFile(path);
        return;
      }
    }
    statusBarMessage(QStringLiteral("未自动找到 site-data.json，请点击“打开 JSON”。"));
  }

private:
  QString filePath_;
  QJsonObject data_;

  QLineEdit *displayName_ = nullptr;
  QLineEdit *shortName_ = nullptr;
  QLineEdit *brandMark_ = nullptr;
  QLineEdit *username_ = nullptr;
  QLineEdit *role_ = nullptr;
  QLineEdit *focus_ = nullptr;
  QLineEdit *status_ = nullptr;
  QLineEdit *email_ = nullptr;
  QLineEdit *github_ = nullptr;
  QLineEdit *bilibili_ = nullptr;
  QLineEdit *telegram_ = nullptr;
  QTextEdit *heroIntro_ = nullptr;
  QTextEdit *aboutText_ = nullptr;
  QTextEdit *contactText_ = nullptr;
  QLineEdit *footerText_ = nullptr;

  QLineEdit *themeColor_ = nullptr;
  QLineEdit *heroImage_ = nullptr;
  QLineEdit *heroEyebrow_ = nullptr;
  QLineEdit *primaryButtonText_ = nullptr;
  QLineEdit *primaryButtonHref_ = nullptr;
  QLineEdit *secondaryButtonText_ = nullptr;
  QTableWidget *keywordsTable_ = nullptr;

  QTableWidget *collectionTable_ = nullptr;
  QTableWidget *projectsTable_ = nullptr;

  struct CommandResult {
    bool ok = false;
    int exitCode = -1;
    QString output;
  };

  struct PublishResult {
    bool ok = false;
    QString message;
  };

  void buildUi() {
    auto *toolbar = addToolBar(QStringLiteral("文件"));
    toolbar->setMovable(false);
    auto *openAction = toolbar->addAction(QStringLiteral("打开 JSON"));
    auto *saveAction = toolbar->addAction(QStringLiteral("保存并同步"));
    auto *saveAsAction = toolbar->addAction(QStringLiteral("另存为"));

    connect(openAction, &QAction::triggered, this, [this] { chooseAndOpen(); });
    connect(saveAction, &QAction::triggered, this, [this] { saveFile(false); });
    connect(saveAsAction, &QAction::triggered, this, [this] { saveFile(true); });

    auto *tabs = new QTabWidget(this);
    tabs->addTab(buildPersonTab(), QStringLiteral("个人资料"));
    tabs->addTab(buildHomeTab(), QStringLiteral("首页设置"));
    tabs->addTab(buildCollectionTab(), QStringLiteral("收藏夹"));
    tabs->addTab(buildProjectsTab(), QStringLiteral("想展示的东西"));
    setCentralWidget(tabs);
  }

  QWidget *buildPersonTab() {
    auto *page = new QWidget;
    auto *layout = new QVBoxLayout(page);
    auto *form = new QFormLayout;

    displayName_ = line();
    shortName_ = line();
    brandMark_ = line();
    username_ = line();
    role_ = line();
    focus_ = line();
    status_ = line();
    email_ = line();
    github_ = line();
    bilibili_ = line();
    telegram_ = line();
    heroIntro_ = text(80);
    aboutText_ = text(120);
    contactText_ = text(80);
    footerText_ = line();

    form->addRow(QStringLiteral("显示名称"), displayName_);
    form->addRow(QStringLiteral("短名称"), shortName_);
    form->addRow(QStringLiteral("导航标记"), brandMark_);
    form->addRow(QStringLiteral("常用 ID"), username_);
    form->addRow(QStringLiteral("身份"), role_);
    form->addRow(QStringLiteral("关注方向"), focus_);
    form->addRow(QStringLiteral("状态"), status_);
    form->addRow(QStringLiteral("邮箱"), email_);
    form->addRow(QStringLiteral("GitHub"), github_);
    form->addRow(QStringLiteral("Bilibili"), bilibili_);
    form->addRow(QStringLiteral("Telegram"), telegram_);
    form->addRow(QStringLiteral("首屏简介"), heroIntro_);
    form->addRow(QStringLiteral("关于我介绍"), aboutText_);
    form->addRow(QStringLiteral("联系区说明"), contactText_);
    form->addRow(QStringLiteral("页脚文字"), footerText_);

    layout->addWidget(hint(QStringLiteral("这里只编辑一份个人资料。保存后，网页标题、导航、首屏、关于我、联系方式会自动同步使用这些信息，并推送到 GitHub Pages。")));
    layout->addLayout(form);
    return page;
  }

  QWidget *buildHomeTab() {
    auto *page = new QWidget;
    auto *layout = new QVBoxLayout(page);
    auto *form = new QFormLayout;

    themeColor_ = line();
    heroImage_ = line();
    heroEyebrow_ = line();
    primaryButtonText_ = line();
    primaryButtonHref_ = line();
    secondaryButtonText_ = line();

    form->addRow(QStringLiteral("主题色"), themeColor_);
    form->addRow(QStringLiteral("首屏图片路径"), heroImage_);
    form->addRow(QStringLiteral("首屏小标题"), heroEyebrow_);
    form->addRow(QStringLiteral("主按钮文字"), primaryButtonText_);
    form->addRow(QStringLiteral("主按钮链接"), primaryButtonHref_);
    form->addRow(QStringLiteral("邮件按钮文字"), secondaryButtonText_);

    keywordsTable_ = table({QStringLiteral("关键词")});

    layout->addWidget(hint(QStringLiteral("这些是展示设置；个人身份信息仍然从“个人资料”自动生成。")));
    layout->addLayout(form);
    layout->addWidget(label(QStringLiteral("首页关键词")));
    layout->addWidget(withButtons(keywordsTable_));
    return page;
  }

  QWidget *buildCollectionTab() {
    auto *page = new QWidget;
    auto *layout = new QVBoxLayout(page);
    collectionTable_ = table({QStringLiteral("图标/编号"), QStringLiteral("标题"), QStringLiteral("说明")});
    layout->addWidget(hint(QStringLiteral("这里可以添加、删除和调整收藏夹卡片。")));
    layout->addWidget(withButtons(collectionTable_));
    return page;
  }

  QWidget *buildProjectsTab() {
    auto *page = new QWidget;
    auto *layout = new QVBoxLayout(page);
    projectsTable_ = table({QStringLiteral("标题"), QStringLiteral("说明"), QStringLiteral("标签，用英文逗号分隔")});
    layout->addWidget(hint(QStringLiteral("这里可以添加、删除和调整“想展示的东西”。")));
    layout->addWidget(withButtons(projectsTable_));
    return page;
  }

  QLineEdit *line() const {
    auto *widget = new QLineEdit;
    widget->setMinimumHeight(30);
    return widget;
  }

  QTextEdit *text(int height) const {
    auto *widget = new QTextEdit;
    widget->setMinimumHeight(height);
    return widget;
  }

  QLabel *label(const QString &value) const {
    auto *widget = new QLabel(value);
    widget->setStyleSheet(QStringLiteral("font-weight: 700; margin-top: 8px;"));
    return widget;
  }

  QLabel *hint(const QString &value) const {
    auto *widget = new QLabel(value);
    widget->setWordWrap(true);
    widget->setStyleSheet(QStringLiteral("padding: 10px; border-radius: 8px; background: #fff4cf; color: #59424b;"));
    return widget;
  }

  QTableWidget *table(const QStringList &headers) const {
    auto *widget = new QTableWidget(0, headers.size());
    widget->setHorizontalHeaderLabels(headers);
    widget->horizontalHeader()->setStretchLastSection(true);
    widget->verticalHeader()->setVisible(false);
    widget->setSelectionBehavior(QAbstractItemView::SelectRows);
    widget->setSelectionMode(QAbstractItemView::SingleSelection);
    widget->setAlternatingRowColors(true);
    return widget;
  }

  QWidget *withButtons(QTableWidget *tableWidget) const {
    auto *box = new QWidget;
    auto *layout = new QVBoxLayout(box);
    layout->setContentsMargins(0, 0, 0, 0);

    auto *buttons = new QWidget;
    auto *buttonLayout = new QHBoxLayout(buttons);
    buttonLayout->setContentsMargins(0, 0, 0, 0);
    auto *add = new QPushButton(QStringLiteral("添加"));
    auto *remove = new QPushButton(QStringLiteral("删除选中"));
    auto *up = new QPushButton(QStringLiteral("上移"));
    auto *down = new QPushButton(QStringLiteral("下移"));
    buttonLayout->addWidget(add);
    buttonLayout->addWidget(remove);
    buttonLayout->addWidget(up);
    buttonLayout->addWidget(down);
    buttonLayout->addStretch();

    connect(add, &QPushButton::clicked, tableWidget, [tableWidget] {
      const int row = tableWidget->rowCount();
      tableWidget->insertRow(row);
      for (int column = 0; column < tableWidget->columnCount(); ++column) {
        tableWidget->setItem(row, column, new QTableWidgetItem);
      }
      tableWidget->selectRow(row);
    });
    connect(remove, &QPushButton::clicked, tableWidget, [tableWidget] {
      const int row = currentRow(tableWidget);
      if (row >= 0) {
        tableWidget->removeRow(row);
      }
    });
    connect(up, &QPushButton::clicked, tableWidget, [tableWidget] { moveRow(tableWidget, -1); });
    connect(down, &QPushButton::clicked, tableWidget, [tableWidget] { moveRow(tableWidget, 1); });

    layout->addWidget(buttons);
    layout->addWidget(tableWidget);
    return box;
  }

  static int currentRow(QTableWidget *tableWidget) {
    const auto selected = tableWidget->selectionModel()->selectedRows();
    return selected.isEmpty() ? -1 : selected.first().row();
  }

  static QString itemText(QTableWidget *tableWidget, int row, int column) {
    const auto *item = tableWidget->item(row, column);
    return item ? item->text() : QString();
  }

  static void setItemText(QTableWidget *tableWidget, int row, int column, const QString &value) {
    auto *item = tableWidget->item(row, column);
    if (!item) {
      item = new QTableWidgetItem;
      tableWidget->setItem(row, column, item);
    }
    item->setText(value);
  }

  static void moveRow(QTableWidget *tableWidget, int direction) {
    const int row = currentRow(tableWidget);
    const int target = row + direction;
    if (row < 0 || target < 0 || target >= tableWidget->rowCount()) {
      return;
    }

    QStringList rowValues;
    QStringList targetValues;
    for (int column = 0; column < tableWidget->columnCount(); ++column) {
      rowValues << itemText(tableWidget, row, column);
      targetValues << itemText(tableWidget, target, column);
    }

    for (int column = 0; column < tableWidget->columnCount(); ++column) {
      setItemText(tableWidget, row, column, targetValues.value(column));
      setItemText(tableWidget, target, column, rowValues.value(column));
    }
    tableWidget->selectRow(target);
  }

  void chooseAndOpen() {
    const QString path = QFileDialog::getOpenFileName(
        this, QStringLiteral("选择 site-data.json"), QString(), QStringLiteral("JSON 文件 (*.json)"));
    if (!path.isEmpty()) {
      openFile(path);
    }
  }

  void saveFile(bool saveAs) {
    if (saveAs || filePath_.isEmpty()) {
      const QString path = QFileDialog::getSaveFileName(
          this, QStringLiteral("保存 site-data.json"), filePath_.isEmpty() ? QStringLiteral("site-data.json") : filePath_,
          QStringLiteral("JSON 文件 (*.json)"));
      if (path.isEmpty()) {
        return;
      }
      filePath_ = path;
    }

    data_ = collectFromUi();
    QFile file(filePath_);
    if (!file.open(QIODevice::WriteOnly | QIODevice::Truncate)) {
      QMessageBox::warning(this, QStringLiteral("保存失败"), file.errorString());
      return;
    }
    file.write(QJsonDocument(data_).toJson(QJsonDocument::Indented));
    file.close();

    statusBarMessage(QStringLiteral("已保存，正在同步到 GitHub Pages..."));
    const auto publishResult = publishToGitHubPages();
    if (publishResult.ok) {
      statusBarMessage(publishResult.message);
      QMessageBox::information(this, QStringLiteral("同步完成"), publishResult.message);
    } else {
      statusBarMessage(QStringLiteral("已保存，但同步失败"));
      QMessageBox::warning(this, QStringLiteral("同步失败"), publishResult.message);
    }
  }

  void statusBarMessage(const QString &message) {
    statusBar()->showMessage(message, 5000);
  }

  PublishResult publishToGitHubPages() const {
    const QString repoPath = findPublishRepoPath();
    if (repoPath.isEmpty()) {
      return {false, QStringLiteral("找不到 publish-pages GitHub Pages 仓库。请确认它还在主页项目目录里。")};
    }

    const QString targetPath = QDir(repoPath).filePath(QStringLiteral("site-data.json"));
    const QString sourcePath = QFileInfo(filePath_).canonicalFilePath();
    const QString canonicalTarget = QFileInfo(targetPath).canonicalFilePath();
    if (sourcePath != canonicalTarget) {
      QFile::remove(targetPath);
      if (!QFile::copy(filePath_, targetPath)) {
        return {false, QStringLiteral("保存成功，但复制到发布仓库失败：") + targetPath};
      }
    }

    auto status = runGit(repoPath, {QStringLiteral("status"), QStringLiteral("--short"), QStringLiteral("--"),
                                    QStringLiteral("site-data.json")});
    if (!status.ok) {
      return {false, QStringLiteral("检查 Git 状态失败：\n") + status.output};
    }
    if (status.output.trimmed().isEmpty()) {
      return {true, QStringLiteral("已保存，GitHub Pages 内容没有新变化。")};
    }

    auto add = runGit(repoPath, {QStringLiteral("add"), QStringLiteral("site-data.json")});
    if (!add.ok) {
      return {false, QStringLiteral("Git 暂存失败：\n") + add.output};
    }

    auto commit = runGit(repoPath, {QStringLiteral("commit"), QStringLiteral("-m"),
                                    QStringLiteral("Update site data from editor")});
    if (!commit.ok) {
      return {false, QStringLiteral("Git 提交失败：\n") + commit.output};
    }

    const QString branchName = currentBranchName(repoPath);
    auto push = runGit(repoPath, {QStringLiteral("push"), QStringLiteral("origin"), branchName}, 120000);
    if (!push.ok) {
      return {false, QStringLiteral("Git 推送失败：\n") + push.output};
    }

    return {true, QStringLiteral("已保存并同步到 GitHub Pages。通常几十秒后网页会刷新。")};
  }

  QString findPublishRepoPath() const {
    const QFileInfo dataFile(filePath_);
    const QString dataDir = dataFile.absolutePath();
    const QString appDir = QCoreApplication::applicationDirPath();
    const QString cwd = QDir::currentPath();
    QStringList candidates = {
        QDir(dataDir).filePath(QStringLiteral("publish-pages")),
        QDir(dataDir).filePath(QStringLiteral("../publish-pages")),
        QDir(appDir).filePath(QStringLiteral("../../publish-pages")),
        QDir(appDir).filePath(QStringLiteral("../publish-pages")),
        QDir(cwd).filePath(QStringLiteral("publish-pages")),
    };
    if (QFileInfo(dataDir).fileName() == QStringLiteral("publish-pages")) {
      candidates.prepend(dataDir);
    }

    for (const auto &candidate : candidates) {
      const QString cleanPath = QDir::cleanPath(candidate);
      if (QDir(cleanPath).exists(QStringLiteral(".git")) && QFileInfo::exists(QDir(cleanPath).filePath(QStringLiteral("site-data.json")))) {
        return cleanPath;
      }
    }
    return QString();
  }

  QString currentBranchName(const QString &repoPath) const {
    auto branch = runGit(repoPath, {QStringLiteral("rev-parse"), QStringLiteral("--abbrev-ref"), QStringLiteral("HEAD")});
    const QString branchName = branch.output.trimmed();
    if (branch.ok && !branchName.isEmpty() && branchName != QStringLiteral("HEAD")) {
      return branchName;
    }
    return QStringLiteral("main");
  }
  CommandResult runGit(const QString &workingDirectory, const QStringList &arguments, int timeoutMs = 30000) const {
    QProcess process;
    process.setWorkingDirectory(workingDirectory);
    process.start(QStringLiteral("git"), arguments);
    if (!process.waitForStarted(5000)) {
      return {false, -1, QStringLiteral("无法启动 git，请确认 Git 已安装并在 PATH 中。")};
    }
    if (!process.waitForFinished(timeoutMs)) {
      process.kill();
      process.waitForFinished();
      return {false, -1, QStringLiteral("Git 命令超时：git ") + arguments.join(QStringLiteral(" "))};
    }

    const QString output = QString::fromLocal8Bit(process.readAllStandardOutput()) +
                           QString::fromLocal8Bit(process.readAllStandardError());
    return {process.exitStatus() == QProcess::NormalExit && process.exitCode() == 0, process.exitCode(), output};
  }

  static QStringList defaultDataFileCandidates() {
    const QString appDir = QCoreApplication::applicationDirPath();
    const QString cwd = QDir::currentPath();
    return {
        QDir::cleanPath(appDir + QStringLiteral("/../../site-data.json")),
        QDir::cleanPath(appDir + QStringLiteral("/../site-data.json")),
        QDir::cleanPath(appDir + QStringLiteral("/site-data.json")),
        QDir::cleanPath(cwd + QStringLiteral("/site-data.json")),
    };
  }

  QJsonObject normalize(const QJsonObject &input) const {
    QJsonObject normalized = input;

    if (!normalized.contains(QStringLiteral("person"))) {
      QJsonObject person;
      const auto profile = input.value(QStringLiteral("profile")).toObject();
      const auto hero = input.value(QStringLiteral("hero")).toObject();
      const auto about = input.value(QStringLiteral("about")).toObject();
      const auto contact = input.value(QStringLiteral("contact")).toObject();
      const auto footer = input.value(QStringLiteral("footer")).toObject();
      person[QStringLiteral("displayName")] = profile.value(QStringLiteral("brandName")).toString(QStringLiteral("Carlos Chen"));
      person[QStringLiteral("shortName")] = profile.value(QStringLiteral("brandName")).toString(QStringLiteral("Carlos"));
      person[QStringLiteral("brandMark")] = profile.value(QStringLiteral("brandMark")).toString(QStringLiteral("C"));
      person[QStringLiteral("username")] = QStringLiteral("carloschen185");
      person[QStringLiteral("role")] = QStringLiteral("电脑爱好者 / 工具折腾者");
      person[QStringLiteral("focus")] = QStringLiteral("电脑 / 工程 / AI 工具");
      person[QStringLiteral("status")] = QStringLiteral("继续折腾中");
      person[QStringLiteral("email")] = QStringLiteral("carloschen185@163.com");
      person[QStringLiteral("github")] = QStringLiteral("https://github.com/carloschen185");
      person[QStringLiteral("bilibili")] = QStringLiteral("https://space.bilibili.com/3546372894624283");
      person[QStringLiteral("telegram")] = QStringLiteral("https://t.me/carloschen185");
      person[QStringLiteral("heroIntro")] = hero.value(QStringLiteral("intro")).toString();
      person[QStringLiteral("aboutText")] = about.value(QStringLiteral("text")).toString();
      person[QStringLiteral("contactText")] = contact.value(QStringLiteral("text")).toString();
      person[QStringLiteral("footerText")] = footer.value(QStringLiteral("text")).toString(QStringLiteral("Made with a soft little mood."));
      normalized[QStringLiteral("person")] = person;
    }

    if (!normalized.contains(QStringLiteral("sections"))) {
      normalized[QStringLiteral("sections")] = QJsonObject{
          {QStringLiteral("collectionEyebrow"), QStringLiteral("Collection")},
          {QStringLiteral("collectionTitle"), QStringLiteral("小收藏夹")},
          {QStringLiteral("projectEyebrow"), QStringLiteral("Works")},
          {QStringLiteral("projectTitle"), QStringLiteral("最近想展示的东西")},
          {QStringLiteral("contactEyebrow"), QStringLiteral("Contact")},
          {QStringLiteral("contactTitle"), QStringLiteral("来找我玩")},
          {QStringLiteral("footerBackToTopText"), QStringLiteral("回到顶部")}};
    }

    return normalized;
  }

  void loadToUi() {
    const auto person = data_.value(QStringLiteral("person")).toObject();
    const auto site = data_.value(QStringLiteral("site")).toObject();
    const auto hero = data_.value(QStringLiteral("hero")).toObject();

    displayName_->setText(person.value(QStringLiteral("displayName")).toString());
    shortName_->setText(person.value(QStringLiteral("shortName")).toString());
    brandMark_->setText(person.value(QStringLiteral("brandMark")).toString());
    username_->setText(person.value(QStringLiteral("username")).toString());
    role_->setText(person.value(QStringLiteral("role")).toString());
    focus_->setText(person.value(QStringLiteral("focus")).toString());
    status_->setText(person.value(QStringLiteral("status")).toString());
    email_->setText(person.value(QStringLiteral("email")).toString());
    github_->setText(person.value(QStringLiteral("github")).toString());
    bilibili_->setText(person.value(QStringLiteral("bilibili")).toString());
    telegram_->setText(person.value(QStringLiteral("telegram")).toString());
    heroIntro_->setPlainText(person.value(QStringLiteral("heroIntro")).toString());
    aboutText_->setPlainText(person.value(QStringLiteral("aboutText")).toString());
    contactText_->setPlainText(person.value(QStringLiteral("contactText")).toString());
    footerText_->setText(person.value(QStringLiteral("footerText")).toString());

    themeColor_->setText(site.value(QStringLiteral("themeColor")).toString(QStringLiteral("#fff4cf")));
    heroImage_->setText(site.value(QStringLiteral("heroImage")).toString(QStringLiteral("assets/hero-cute.jpg")));
    heroEyebrow_->setText(hero.value(QStringLiteral("eyebrow")).toString(QStringLiteral("Hello, welcome")));
    primaryButtonText_->setText(hero.value(QStringLiteral("primaryButtonText")).toString(QStringLiteral("看看作品")));
    primaryButtonHref_->setText(hero.value(QStringLiteral("primaryButtonHref")).toString(QStringLiteral("#projects")));
    secondaryButtonText_->setText(hero.value(QStringLiteral("secondaryButtonText")).toString(QStringLiteral("发封邮件")));
    fillStringTable(keywordsTable_, hero.value(QStringLiteral("keywords")).toArray());

    fillObjectTable(collectionTable_, data_.value(QStringLiteral("collectionItems")).toArray(),
                    {QStringLiteral("icon"), QStringLiteral("title"), QStringLiteral("text")});
    fillProjectsTable(data_.value(QStringLiteral("projects")).toArray());
  }

  QJsonObject collectFromUi() const {
    QJsonObject root;
    root[QStringLiteral("person")] = QJsonObject{
        {QStringLiteral("displayName"), displayName_->text()},
        {QStringLiteral("shortName"), shortName_->text()},
        {QStringLiteral("brandMark"), brandMark_->text()},
        {QStringLiteral("username"), username_->text()},
        {QStringLiteral("role"), role_->text()},
        {QStringLiteral("focus"), focus_->text()},
        {QStringLiteral("status"), status_->text()},
        {QStringLiteral("email"), email_->text()},
        {QStringLiteral("github"), github_->text()},
        {QStringLiteral("bilibili"), bilibili_->text()},
        {QStringLiteral("telegram"), telegram_->text()},
        {QStringLiteral("heroIntro"), heroIntro_->toPlainText()},
        {QStringLiteral("aboutText"), aboutText_->toPlainText()},
        {QStringLiteral("contactText"), contactText_->toPlainText()},
        {QStringLiteral("footerText"), footerText_->text()}};

    root[QStringLiteral("site")] =
        QJsonObject{{QStringLiteral("themeColor"), themeColor_->text()}, {QStringLiteral("heroImage"), heroImage_->text()}};
    root[QStringLiteral("hero")] = QJsonObject{
        {QStringLiteral("eyebrow"), heroEyebrow_->text()},
        {QStringLiteral("primaryButtonText"), primaryButtonText_->text()},
        {QStringLiteral("primaryButtonHref"), primaryButtonHref_->text()},
        {QStringLiteral("secondaryButtonText"), secondaryButtonText_->text()},
        {QStringLiteral("keywords"), collectStringTable(keywordsTable_)}};
    root[QStringLiteral("sections")] = data_.value(QStringLiteral("sections")).toObject();
    root[QStringLiteral("collectionItems")] =
        collectObjectTable(collectionTable_, {QStringLiteral("icon"), QStringLiteral("title"), QStringLiteral("text")});
    root[QStringLiteral("projects")] = collectProjectsTable();
    return root;
  }

  static void fillStringTable(QTableWidget *tableWidget, const QJsonArray &values) {
    tableWidget->setRowCount(0);
    for (const auto &value : values) {
      const int row = tableWidget->rowCount();
      tableWidget->insertRow(row);
      setItemText(tableWidget, row, 0, value.toString());
    }
  }

  static QJsonArray collectStringTable(QTableWidget *tableWidget) {
    QJsonArray values;
    for (int row = 0; row < tableWidget->rowCount(); ++row) {
      const QString value = itemText(tableWidget, row, 0).trimmed();
      if (!value.isEmpty()) {
        values.append(value);
      }
    }
    return values;
  }

  static void fillObjectTable(QTableWidget *tableWidget, const QJsonArray &values, const QStringList &keys) {
    tableWidget->setRowCount(0);
    for (const auto &value : values) {
      const auto object = value.toObject();
      const int row = tableWidget->rowCount();
      tableWidget->insertRow(row);
      for (int column = 0; column < keys.size(); ++column) {
        setItemText(tableWidget, row, column, object.value(keys.at(column)).toString());
      }
    }
  }

  static QJsonArray collectObjectTable(QTableWidget *tableWidget, const QStringList &keys) {
    QJsonArray values;
    for (int row = 0; row < tableWidget->rowCount(); ++row) {
      QJsonObject object;
      bool hasValue = false;
      for (int column = 0; column < keys.size(); ++column) {
        const QString value = itemText(tableWidget, row, column).trimmed();
        object[keys.at(column)] = value;
        hasValue = hasValue || !value.isEmpty();
      }
      if (hasValue) {
        values.append(object);
      }
    }
    return values;
  }

  void fillProjectsTable(const QJsonArray &values) {
    projectsTable_->setRowCount(0);
    for (const auto &value : values) {
      const auto object = value.toObject();
      QStringList tags;
      for (const auto &tag : object.value(QStringLiteral("tags")).toArray()) {
        tags << tag.toString();
      }
      const int row = projectsTable_->rowCount();
      projectsTable_->insertRow(row);
      setItemText(projectsTable_, row, 0, object.value(QStringLiteral("title")).toString());
      setItemText(projectsTable_, row, 1, object.value(QStringLiteral("text")).toString());
      setItemText(projectsTable_, row, 2, tags.join(QStringLiteral(", ")));
    }
  }

  QJsonArray collectProjectsTable() const {
    QJsonArray values;
    for (int row = 0; row < projectsTable_->rowCount(); ++row) {
      const QString title = itemText(projectsTable_, row, 0).trimmed();
      const QString textValue = itemText(projectsTable_, row, 1).trimmed();
      const QString tagText = itemText(projectsTable_, row, 2);
      if (title.isEmpty() && textValue.isEmpty() && tagText.trimmed().isEmpty()) {
        continue;
      }

      QJsonArray tags;
      for (const QString &tag : tagText.split(QStringLiteral(","), Qt::SkipEmptyParts)) {
        tags.append(tag.trimmed());
      }
      values.append(QJsonObject{{QStringLiteral("title"), title}, {QStringLiteral("text"), textValue}, {QStringLiteral("tags"), tags}});
    }
    return values;
  }
};

int main(int argc, char *argv[]) {
  QApplication app(argc, argv);
  SiteInfoEditor editor;
  editor.show();

  if (argc > 1) {
    editor.openFile(QString::fromLocal8Bit(argv[1]));
  } else {
    editor.openDefaultFile();
  }

  return app.exec();
}
