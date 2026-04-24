import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const localesRoot = join(scriptDir, "..", "src", "locales");

async function readJson(path) {
  const source = await readFile(path, "utf8");
  return JSON.parse(source);
}

async function writeJson(path, data) {
  await writeFile(path, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function setPath(obj, path, value) {
  const keys = path.split(".");
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const arrayMatch = key.match(/^(\w+)\[(\d+)]$/);
    if (arrayMatch) {
      current = current[arrayMatch[1]][parseInt(arrayMatch[2], 10)];
    } else {
      current = current[key];
    }
  }
  const lastKey = keys[keys.length - 1];
  const arrayMatch = lastKey.match(/^(\w+)\[(\d+)]$/);
  if (arrayMatch) {
    current[arrayMatch[1]][parseInt(arrayMatch[2], 10)] = value;
  } else {
    current[lastKey] = value;
  }
}

function getPath(obj, path) {
  const keys = path.split(".");
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const arrayMatch = key.match(/^(\w+)\[(\d+)]$/);
    if (arrayMatch) {
      current = current[arrayMatch[1]][parseInt(arrayMatch[2], 10)];
    } else {
      current = current[key];
    }
  }
  const lastKey = keys[keys.length - 1];
  const arrayMatch = lastKey.match(/^(\w+)\[(\d+)]$/);
  if (arrayMatch) {
    return current[arrayMatch[1]][parseInt(arrayMatch[2], 10)];
  }
  return current[lastKey];
}

function findUntranslated(enObj, targetObj, path = "") {
  const untranslated = [];
  for (const key of Object.keys(enObj)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (typeof enObj[key] === "string") {
      if (targetObj[key] === enObj[key]) {
        untranslated.push(currentPath);
      }
    } else if (Array.isArray(enObj[key])) {
      for (let i = 0; i < enObj[key].length; i++) {
        const itemPath = `${currentPath}[${i}]`;
        if (typeof enObj[key][i] === "string") {
          if (targetObj[key][i] === enObj[key][i]) {
            untranslated.push(itemPath);
          }
        } else if (typeof enObj[key][i] === "object") {
          const sub = findUntranslated(enObj[key][i], targetObj[key][i], itemPath);
          untranslated.push(...sub);
        }
      }
    } else if (typeof enObj[key] === "object") {
      const sub = findUntranslated(enObj[key], targetObj[key], currentPath);
      untranslated.push(...sub);
    }
  }
  return untranslated;
}

async function main() {
  const en = await readJson(join(localesRoot, "en", "routes.json"));
  const ar = await readJson(join(localesRoot, "ar", "routes.json"));
  const zh = await readJson(join(localesRoot, "zh", "routes.json"));

  const arMissing = findUntranslated(en, ar);
  const zhMissing = findUntranslated(en, zh);

  console.log("AR missing:", arMissing.length);
  console.log("ZH missing:", zhMissing.length);

  // Translation dictionaries
  const arDict = {};
  const zhDict = {};

  // Add translations here

  // ========== COMMON ==========
  arDict["common.savedPostActions"] = "إجراءات المنشور المحفوظ";
  zhDict["common.savedPostActions"] = "已保存帖子操作";
  arDict["common.postOptions"] = "خيارات المنشور";
  zhDict["common.postOptions"] = "帖子选项";
  arDict["common.playVideo"] = "تشغيل الفيديو";
  zhDict["common.playVideo"] = "播放视频";
  arDict["common.videoThumbnail"] = "صورة مصغرة للفيديو";
  zhDict["common.videoThumbnail"] = "视频缩略图";
  arDict["common.noAssetsYet"] = "لا توجد أصول بعد.";
  zhDict["common.noAssetsYet"] = "还没有资产。";
  arDict["common.later"] = "لاحقًا.";
  zhDict["common.later"] = "稍后。";

  // ========== CREATE POST ==========
  arDict["createPost.fields.charity"] = "الجهة الخيرية";
  zhDict["createPost.fields.charity"] = "慈善机构";

  // createPost.live
  arDict["createPost.live.roomKind"] = "نوع الغرفة";
  zhDict["createPost.live.roomKind"] = "房间类型";
  arDict["createPost.live.access"] = "الوصول";
  zhDict["createPost.live.access"] = "访问权限";
  arDict["createPost.live.visibility"] = "الرؤية";
  zhDict["createPost.live.visibility"] = "可见性";
  arDict["createPost.live.guestPerformer"] = "ضيف العرض";
  zhDict["createPost.live.guestPerformer"] = "嘉宾表演者";
  arDict["createPost.live.collaboratorPlaceholder"] = "ابحث عن متعاون";
  zhDict["createPost.live.collaboratorPlaceholder"] = "搜索合作者";
  arDict["createPost.live.collaboratorNote"] = "ادعُ متعاونًا لهذه الجلسة الثنائية.";
  zhDict["createPost.live.collaboratorNote"] = "为这次二重唱邀请一位合作者。";
  arDict["createPost.live.performerAllocations"] = "توزيعات العارضين";
  zhDict["createPost.live.performerAllocations"] = "表演者分配";
  arDict["createPost.live.soloProceedsDescription"] = "يحصل المضيف على 100% من عائدات جانب العارضين.";
  zhDict["createPost.live.soloProceedsDescription"] = "主播获得表演方收益的 100%。";
  arDict["createPost.live.duetProceedsDescription"] = "اقسم عائدات جانب العارضين بين المضيف والمتعاون.";
  zhDict["createPost.live.duetProceedsDescription"] = "在主播和合作者之间分配表演方收益。";
  arDict["createPost.live.hostLabel"] = "المضيف";
  zhDict["createPost.live.hostLabel"] = "主播";
  arDict["createPost.live.guestLabel"] = "الضيف";
  zhDict["createPost.live.guestLabel"] = "嘉宾";
  arDict["createPost.live.youLabel"] = "أنت";
  zhDict["createPost.live.youLabel"] = "你";
  arDict["createPost.live.collaboratorLabel"] = "المتعاون";
  zhDict["createPost.live.collaboratorLabel"] = "合作者";
  arDict["createPost.live.allocationsError"] = "يجب أن يكون مجموع التوزيعات 100%";
  zhDict["createPost.live.allocationsError"] = "分配总和必须等于 100%";
  arDict["createPost.live.setlistTitle"] = "قائمة العروض";
  zhDict["createPost.live.setlistTitle"] = "歌单";
  arDict["createPost.live.addSong"] = "أضف أغنية";
  zhDict["createPost.live.addSong"] = "添加歌曲";
  arDict["createPost.live.emptySetlist"] = "لا توجد أغانٍ بعد. أضف أغنية واحدة على الأقل قبل البث المباشر.";
  zhDict["createPost.live.emptySetlist"] = "还没有歌曲。开始直播前至少添加一首歌。";
  arDict["createPost.live.roomKindSolo"] = "منفرد";
  zhDict["createPost.live.roomKindSolo"] = "独唱";
  arDict["createPost.live.roomKindDuet"] = "ثنائي";
  zhDict["createPost.live.roomKindDuet"] = "对唱";
  arDict["createPost.live.accessFree"] = "مجاني";
  zhDict["createPost.live.accessFree"] = "免费";
  arDict["createPost.live.accessGated"] = "مقيد";
  zhDict["createPost.live.accessGated"] = "受限";
  arDict["createPost.live.accessPaid"] = "مدفوع";
  zhDict["createPost.live.accessPaid"] = "付费";
  arDict["createPost.live.visibilityPublic"] = "عام";
  zhDict["createPost.live.visibilityPublic"] = "公开";
  arDict["createPost.live.visibilityUnlisted"] = "غير مدرج";
  zhDict["createPost.live.visibilityUnlisted"] = "不公开";

  // createPost.genres
  arDict["createPost.genres.electronic"] = "إلكتروني";
  zhDict["createPost.genres.electronic"] = "电子";
  arDict["createPost.genres.hipHop"] = "هيب هوب";
  zhDict["createPost.genres.hipHop"] = "嘻哈";
  arDict["createPost.genres.pop"] = "بوب";
  zhDict["createPost.genres.pop"] = "流行";
  arDict["createPost.genres.rb"] = "ريذ أند بلوز";
  zhDict["createPost.genres.rb"] = "R&B";
  arDict["createPost.genres.rock"] = "روك";
  zhDict["createPost.genres.rock"] = "摇滚";
  arDict["createPost.genres.ambient"] = "أمبينت";
  zhDict["createPost.genres.ambient"] = "氛围";

  // createPost.languages
  arDict["createPost.languages.english"] = "الإنجليزية";
  zhDict["createPost.languages.english"] = "英语";
  arDict["createPost.languages.spanish"] = "الإسبانية";
  zhDict["createPost.languages.spanish"] = "西班牙语";
  arDict["createPost.languages.french"] = "الفرنسية";
  zhDict["createPost.languages.french"] = "法语";
  arDict["createPost.languages.japanese"] = "اليابانية";
  zhDict["createPost.languages.japanese"] = "日语";
  arDict["createPost.languages.korean"] = "الكورية";
  zhDict["createPost.languages.korean"] = "韩语";
  arDict["createPost.languages.portuguese"] = "البرتغالية";
  zhDict["createPost.languages.portuguese"] = "葡萄牙语";

  // ========== INBOX ==========
  arDict["inbox.eventCommentReply"] = "{actor} ردّ على تعليقك";
  zhDict["inbox.eventCommentReply"] = "{actor} 回复了你的评论";
  arDict["inbox.eventPostCommented"] = "{actor} علّق على منشورك";
  zhDict["inbox.eventPostCommented"] = "{actor} 评论了你的帖子";

  // ========== PROFILE / PUBLIC PROFILE ==========
  arDict["profile.scrobblesTab"] = "الاستماعات";
  zhDict["profile.scrobblesTab"] = "Scrobbles";
  arDict["publicProfile.scrobblesTab"] = "الاستماعات";
  zhDict["publicProfile.scrobblesTab"] = "Scrobbles";

  // ========== OWNED AGENTS ==========
  arDict["ownedAgents.handleLabel"] = "معرّف الوكيل";
  zhDict["ownedAgents.handleLabel"] = "代理标识";
  arDict["ownedAgents.handlePlaceholder"] = "night-signal";
  zhDict["ownedAgents.handlePlaceholder"] = "night-signal";
  arDict["ownedAgents.handleRequired"] = "معرّف الوكيل مطلوب.";
  zhDict["ownedAgents.handleRequired"] = "代理标识为必填项。";
  arDict["ownedAgents.providerClawKey"] = "ClawKey";
  zhDict["ownedAgents.providerClawKey"] = "ClawKey";
  arDict["ownedAgents.providerSelf"] = "Self";
  zhDict["ownedAgents.providerSelf"] = "Self";
  arDict["ownedAgents.saveHandleAction"] = "احفظ المعرّف";
  zhDict["ownedAgents.saveHandleAction"] = "保存标识";
  arDict["ownedAgents.saveHandleError"] = "تعذر حفظ معرّف الوكيل.";
  zhDict["ownedAgents.saveHandleError"] = "无法保存代理标识。";
  arDict["ownedAgents.saveNameError"] = "تعذر حفظ اسم الوكيل.";
  zhDict["ownedAgents.saveNameError"] = "无法保存代理名称。";

  // ========== SETTINGS ==========
  arDict["settings.profileSectionTitle"] = "الملف الشخصي";
  zhDict["settings.profileSectionTitle"] = "个人资料";
  arDict["settings.handleNoteEns"] = "ENS";
  zhDict["settings.handleNoteEns"] = "ENS";
  arDict["settings.handlePlaceholder"] = "معرّفك-الجديد";
  zhDict["settings.handlePlaceholder"] = "你的新用户名";

  // ========== WALLET ==========
  arDict["wallet.title"] = "المحفظة";
  zhDict["wallet.title"] = "钱包";
  arDict["wallet.walletAddressLabel"] = "عنوان المحفظة";
  zhDict["wallet.walletAddressLabel"] = "钱包地址";
  arDict["wallet.copied"] = "تم النسخ";
  zhDict["wallet.copied"] = "已复制";
  arDict["wallet.copyAddress"] = "نسخ العنوان";
  zhDict["wallet.copyAddress"] = "复制地址";
  arDict["wallet.evmWallet"] = "محفظة EVM";
  zhDict["wallet.evmWallet"] = "EVM 钱包";
  arDict["wallet.changeWallet"] = "تغيير المحفظة";
  zhDict["wallet.changeWallet"] = "更换钱包";
  arDict["wallet.noWalletConnected"] = "لا توجد محفظة متصلة";
  zhDict["wallet.noWalletConnected"] = "未连接钱包";
  arDict["wallet.balanceLater"] = "لاحقًا";
  zhDict["wallet.balanceLater"] = "稍后";
  arDict["wallet.noAssetsYet"] = "لا توجد أصول بعد.";
  zhDict["wallet.noAssetsYet"] = "还没有资产。";
  arDict["wallet.later"] = "لاحقًا.";
  zhDict["wallet.later"] = "稍后。";

  // ========== CREATE COMMUNITY COMPOSER ==========
  arDict["createCommunity.composer.title"] = "إنشاء مجتمع";
  zhDict["createCommunity.composer.title"] = "创建社区";
  arDict["createCommunity.composer.verificationRequired"] = "التحقق مطلوب";
  zhDict["createCommunity.composer.verificationRequired"] = "需要验证";
  arDict["createCommunity.composer.uniqueHumanRequired"] = "أكمل التحقق البشري الفريد قبل إنشاء مجتمع.";
  zhDict["createCommunity.composer.uniqueHumanRequired"] = "创建社区前请先完成唯一人类验证。";
  arDict["createCommunity.composer.ageVerificationRequired"] = "هذا المجتمع مخصص لمن هم فوق 18 عامًا، لذا يجب على المنشئ أيضًا اجتياز التحقق من العمر قبل الإطلاق.";
  zhDict["createCommunity.composer.ageVerificationRequired"] = "此社区标记为 18+，因此创建者在发布前也必须通过年龄验证。";
  arDict["createCommunity.composer.stepCommunity"] = "الأساسيات";
  zhDict["createCommunity.composer.stepCommunity"] = "基本信息";
  arDict["createCommunity.composer.stepAccess"] = "الوصول";
  zhDict["createCommunity.composer.stepAccess"] = "访问权限";
  arDict["createCommunity.composer.stepReview"] = "المراجعة";
  zhDict["createCommunity.composer.stepReview"] = "审核";
  arDict["createCommunity.composer.detailsSection"] = "تفاصيل المجتمع";
  zhDict["createCommunity.composer.detailsSection"] = "社区详情";
  arDict["createCommunity.composer.preview"] = "معاينة";
  zhDict["createCommunity.composer.preview"] = "预览";
  arDict["createCommunity.composer.visualsSection"] = "الصور";
  zhDict["createCommunity.composer.visualsSection"] = "图片";
  arDict["createCommunity.composer.displayNameLabel"] = "اسم العرض";
  zhDict["createCommunity.composer.displayNameLabel"] = "显示名称";
  arDict["createCommunity.composer.displayNamePlaceholder"] = "اسم المجتمع";
  zhDict["createCommunity.composer.displayNamePlaceholder"] = "社区名称";
  arDict["createCommunity.composer.previewFallback"] = "مجتمع جديد";
  zhDict["createCommunity.composer.previewFallback"] = "新社区";
  arDict["createCommunity.composer.descriptionLabel"] = "الوصف";
  zhDict["createCommunity.composer.descriptionLabel"] = "描述";
  arDict["createCommunity.composer.descriptionPlaceholder"] = "ما الغرض من هذا المجتمع؟";
  zhDict["createCommunity.composer.descriptionPlaceholder"] = "这个社区是做什么的？";
  arDict["createCommunity.composer.databaseRegionLabel"] = "منطقة البيانات";
  zhDict["createCommunity.composer.databaseRegionLabel"] = "数据区域";
  arDict["createCommunity.composer.databaseRegionAuto"] = "🇺🇸 شرق الولايات المتحدة";
  zhDict["createCommunity.composer.databaseRegionAuto"] = "🇺🇸 美国东部";
  arDict["createCommunity.composer.databaseRegionUsEast"] = "🇺🇸 شرق الولايات المتحدة";
  zhDict["createCommunity.composer.databaseRegionUsEast"] = "🇺🇸 美国东部";
  arDict["createCommunity.composer.databaseRegionUsCentral"] = "🇺🇸 وسط الولايات المتحدة";
  zhDict["createCommunity.composer.databaseRegionUsCentral"] = "🇺🇸 美国中部";
  arDict["createCommunity.composer.databaseRegionUsWest"] = "🇺🇸 غرب الولايات المتحدة";
  zhDict["createCommunity.composer.databaseRegionUsWest"] = "🇺🇸 美国西部";
  arDict["createCommunity.composer.databaseRegionEurope"] = "🇮🇪 أيرلندا (الاتحاد الأوروبي)";
  zhDict["createCommunity.composer.databaseRegionEurope"] = "🇮🇪 爱尔兰（欧盟）";
  arDict["createCommunity.composer.databaseRegionIndia"] = "🇮🇳 الهند";
  zhDict["createCommunity.composer.databaseRegionIndia"] = "🇮🇳 印度";
  arDict["createCommunity.composer.databaseRegionJapan"] = "🇯🇵 اليابان";
  zhDict["createCommunity.composer.databaseRegionJapan"] = "🇯🇵 日本";
  arDict["createCommunity.composer.avatarLabel"] = "الصورة الشخصية";
  zhDict["createCommunity.composer.avatarLabel"] = "头像";
  arDict["createCommunity.composer.bannerLabel"] = "الغلاف";
  zhDict["createCommunity.composer.bannerLabel"] = "封面";
  arDict["createCommunity.composer.routeLabel"] = "المسار";
  zhDict["createCommunity.composer.routeLabel"] = "路由";
  arDict["createCommunity.composer.noRoute"] = "لا يوجد مسار موثق";
  zhDict["createCommunity.composer.noRoute"] = "无已验证路由";
  arDict["createCommunity.composer.verificationInProgress"] = "التحقق قيد التقدم";
  zhDict["createCommunity.composer.verificationInProgress"] = "验证进行中";
  arDict["createCommunity.composer.changeRoute"] = "تغيير المسار";
  zhDict["createCommunity.composer.changeRoute"] = "更改路由";
  arDict["createCommunity.composer.resumeVerification"] = "استئناف التحقق";
  zhDict["createCommunity.composer.resumeVerification"] = "继续验证";
  arDict["createCommunity.composer.verifyRoute"] = "التحقق من المسار";
  zhDict["createCommunity.composer.verifyRoute"] = "验证路由";
  arDict["createCommunity.composer.clear"] = "مسح";
  zhDict["createCommunity.composer.clear"] = "清除";
  arDict["createCommunity.composer.membershipSection"] = "العضوية";
  zhDict["createCommunity.composer.membershipSection"] = "成员资格";
  arDict["createCommunity.composer.gateChecksTitle"] = "فحوصات البوابة";
  zhDict["createCommunity.composer.gateChecksTitle"] = "门槛检查";
  arDict["createCommunity.composer.gateChecksDescription"] = "اختر بوابة واحدة على الأقل قبل الإطلاق.";
  zhDict["createCommunity.composer.gateChecksDescription"] = "发布前至少选择一个门槛。";
  arDict["createCommunity.composer.nationalityTitle"] = "التحقق من الجنسية";
  zhDict["createCommunity.composer.nationalityTitle"] = "国籍验证";
  arDict["createCommunity.composer.nationalityDescription"] = "اشترط على الأعضاء التحقق من جنسيتهم عبر Self قبل الانضمام.";
  zhDict["createCommunity.composer.nationalityDescription"] = "要求成员在加入前通过 Self 验证国籍。";
  arDict["createCommunity.composer.allowedNationalityLabel"] = "الجنسيات المسموح بها";
  zhDict["createCommunity.composer.allowedNationalityLabel"] = "允许的国籍";
  arDict["createCommunity.composer.selectValidCountry"] = "اختر دولة صالحة.";
  zhDict["createCommunity.composer.selectValidCountry"] = "选择一个有效的国家。";
  arDict["createCommunity.composer.minimumAgeTitle"] = "الحد الأدنى للعمر";
  zhDict["createCommunity.composer.minimumAgeTitle"] = "最低年龄";
  arDict["createCommunity.composer.minimumAgeDescription"] = "اشترط على الأعضاء إثبات أنهم يستوفون حد العمر المطلوب عبر Self.";
  zhDict["createCommunity.composer.minimumAgeDescription"] = "要求成员证明他们通过 Self 满足年龄门槛。";
  arDict["createCommunity.composer.minimumAgeLabel"] = "الحد الأدنى للعمر";
  zhDict["createCommunity.composer.minimumAgeLabel"] = "最低年龄";
  arDict["createCommunity.composer.minimumAgeInvalid"] = "أدخل عمرًا بين 18 و125.";
  zhDict["createCommunity.composer.minimumAgeInvalid"] = "输入 18 到 125 之间的年龄。";
  arDict["createCommunity.composer.walletScoreTitle"] = "درجة Passport";
  zhDict["createCommunity.composer.walletScoreTitle"] = "Passport 分数";
  arDict["createCommunity.composer.walletScoreDescription"] = "اشترط على الأعضاء تحقيق حد أدنى من درجة Human Passport.";
  zhDict["createCommunity.composer.walletScoreDescription"] = "要求成员达到 Human Passport 分数门槛。";
  arDict["createCommunity.composer.walletScoreLabel"] = "الدرجة الدنيا";
  zhDict["createCommunity.composer.walletScoreLabel"] = "最低分数";
  arDict["createCommunity.composer.walletScoreInvalid"] = "أدخل درجة بين 0 و100.";
  zhDict["createCommunity.composer.walletScoreInvalid"] = "输入 0 到 100 之间的分数。";
  arDict["createCommunity.composer.genderTitle"] = "علامة مستند Self";
  zhDict["createCommunity.composer.genderTitle"] = "Self 文档标记";
  arDict["createCommunity.composer.genderDescription"] = "اشترط على الأعضاء إظهار علامة مستند Self على وثيقة موثقة قبل الانضمام.";
  zhDict["createCommunity.composer.genderDescription"] = "要求成员在加入前出示已验证文档上的 Self 文档标记。";
  arDict["createCommunity.composer.fMarkerLabel"] = "علامة F";
  zhDict["createCommunity.composer.fMarkerLabel"] = "F 标记";
  arDict["createCommunity.composer.fMarkerDetail"] = "اقبل فقط الأعضاء الذين علامة مستند Self لديهم هي F.";
  zhDict["createCommunity.composer.fMarkerDetail"] = "只接受 Self 文档标记为 F 的成员。";
  arDict["createCommunity.composer.mMarkerLabel"] = "علامة M";
  zhDict["createCommunity.composer.mMarkerLabel"] = "M 标记";
  arDict["createCommunity.composer.mMarkerDetail"] = "اقبل فقط الأعضاء الذين علامة مستند Self لديهم هي M.";
  zhDict["createCommunity.composer.mMarkerDetail"] = "只接受 Self 文档标记为 M 的成员。";
  arDict["createCommunity.composer.erc721Title"] = "مجموعة Ethereum NFT";
  zhDict["createCommunity.composer.erc721Title"] = "Ethereum NFT 藏品";
  arDict["createCommunity.composer.erc721Description"] = "اشترط محفظة Ethereum مرتبطة تحمل مجموعة ERC-721 معينة.";
  zhDict["createCommunity.composer.erc721Description"] = "要求持有特定 ERC-721 藏品的已关联 Ethereum 钱包。";
  arDict["createCommunity.composer.collectionContractLabel"] = "عقد المجموعة";
  zhDict["createCommunity.composer.collectionContractLabel"] = "藏品合约";
  arDict["createCommunity.composer.collectionContractPlaceholder"] = "0x...";
  zhDict["createCommunity.composer.collectionContractPlaceholder"] = "0x...";
  arDict["createCommunity.composer.invalidContractAddress"] = "أدخل عنوان عقد Ethereum صالح.";
  zhDict["createCommunity.composer.invalidContractAddress"] = "输入有效的 Ethereum 合约地址。";
  arDict["createCommunity.composer.identityAccessSection"] = "الهوية والوصول";
  zhDict["createCommunity.composer.identityAccessSection"] = "身份与访问";
  arDict["createCommunity.composer.allowAnonymousPosting"] = "السماح بالنشر المجهول";
  zhDict["createCommunity.composer.allowAnonymousPosting"] = "允许匿名发帖";
  arDict["createCommunity.composer.anonymousScopeLabel"] = "نطاق المجهول";
  zhDict["createCommunity.composer.anonymousScopeLabel"] = "匿名范围";
  arDict["createCommunity.composer.ageGateLabel"] = "محتوى للبالغين (18+)";
  zhDict["createCommunity.composer.ageGateLabel"] = "成人内容（18+）";
  arDict["createCommunity.composer.creatorAgeRequired"] = "يجب على المنشئ إكمال التحقق من العمر قبل وضع علامة على المجتمع على أنه للبالغين.";
  zhDict["createCommunity.composer.creatorAgeRequired"] = "创建者必须完成年龄验证，才能将社区标记为成人内容。";
  arDict["createCommunity.composer.back"] = "رجوع";
  zhDict["createCommunity.composer.back"] = "返回";
  arDict["createCommunity.composer.next"] = "التالي";
  zhDict["createCommunity.composer.next"] = "下一步";
  arDict["createCommunity.composer.createCommunityAction"] = "إنشاء المجتمع";
  zhDict["createCommunity.composer.createCommunityAction"] = "创建社区";
  arDict["createCommunity.composer.createError"] = "تعذر إنشاء المجتمع";
  zhDict["createCommunity.composer.createError"] = "无法创建社区";
  arDict["createCommunity.composer.reviewCommunitySection"] = "المجتمع";
  zhDict["createCommunity.composer.reviewCommunitySection"] = "社区";
  arDict["createCommunity.composer.reviewAccessPolicySection"] = "سياسة الوصول";
  zhDict["createCommunity.composer.reviewAccessPolicySection"] = "访问政策";
  arDict["createCommunity.composer.reviewDisplayName"] = "اسم العرض";
  zhDict["createCommunity.composer.reviewDisplayName"] = "显示名称";
  arDict["createCommunity.composer.reviewDescription"] = "الوصف";
  zhDict["createCommunity.composer.reviewDescription"] = "描述";
  arDict["createCommunity.composer.reviewDataRegion"] = "منطقة البيانات";
  zhDict["createCommunity.composer.reviewDataRegion"] = "数据区域";
  arDict["createCommunity.composer.reviewRoute"] = "المسار";
  zhDict["createCommunity.composer.reviewRoute"] = "路由";
  arDict["createCommunity.composer.reviewAvatar"] = "الصورة الشخصية";
  zhDict["createCommunity.composer.reviewAvatar"] = "头像";
  arDict["createCommunity.composer.reviewBanner"] = "الغلاف";
  zhDict["createCommunity.composer.reviewBanner"] = "封面";
  arDict["createCommunity.composer.reviewJoinFlow"] = "تدفق الانضمام";
  zhDict["createCommunity.composer.reviewJoinFlow"] = "加入流程";
  arDict["createCommunity.composer.reviewMembershipGates"] = "بوابات العضوية";
  zhDict["createCommunity.composer.reviewMembershipGates"] = "成员门槛";
  arDict["createCommunity.composer.reviewAnonymousPosting"] = "النشر المجهول";
  zhDict["createCommunity.composer.reviewAnonymousPosting"] = "匿名发帖";
  arDict["createCommunity.composer.reviewAnonymousScope"] = "نطاق المجهول";
  zhDict["createCommunity.composer.reviewAnonymousScope"] = "匿名范围";
  arDict["createCommunity.composer.reviewAgeGate"] = "محتوى للبالغين";
  zhDict["createCommunity.composer.reviewAgeGate"] = "成人内容";
  arDict["createCommunity.composer.membershipOpenLabel"] = "مفتوح";
  zhDict["createCommunity.composer.membershipOpenLabel"] = "开放";
  arDict["createCommunity.composer.membershipOpenDetail"] = "يمكن لأي شخص الانضمام فورًا.";
  zhDict["createCommunity.composer.membershipOpenDetail"] = "任何人都可以立即加入。";
  arDict["createCommunity.composer.membershipRequestLabel"] = "طلب";
  zhDict["createCommunity.composer.membershipRequestLabel"] = "申请";
  arDict["createCommunity.composer.membershipRequestDetail"] = "يطلب المستخدمون الانضمام. العضوية معلقة حتى الموافقة.";
  zhDict["createCommunity.composer.membershipRequestDetail"] = "用户申请加入。成员资格待批准。";
  arDict["createCommunity.composer.membershipGatedLabel"] = "مقيد";
  zhDict["createCommunity.composer.membershipGatedLabel"] = "受限";
  arDict["createCommunity.composer.membershipGatedDetail"] = "يتطلب الانضمام اجتياز بوابة واحدة أو أكثر.";
  zhDict["createCommunity.composer.membershipGatedDetail"] = "加入需要通过一个或多个门槛检查。";
  arDict["createCommunity.composer.anonymousCommunityStableLabel"] = "مستقر-مجتمع";
  zhDict["createCommunity.composer.anonymousCommunityStableLabel"] = "社区稳定";
  arDict["createCommunity.composer.anonymousCommunityStableDetail"] = "اسم مجهول ثابت واحد لكل مستخدم عبر المجتمع بأكمله. الأفضل لاستمرارية الإشراف.";
  zhDict["createCommunity.composer.anonymousCommunityStableDetail"] = "每个用户在整个社区中只有一个持续的匿名标签。最适合 moderation 连续性。";
  arDict["createCommunity.composer.anonymousThreadStableLabel"] = "مستقر-موضوع";
  zhDict["createCommunity.composer.anonymousThreadStableLabel"] = "帖子稳定";
  arDict["createCommunity.composer.anonymousThreadStableDetail"] = "اسم مجهول ثابت واحد لكل مستخدم لكل موضوع. المواضيع المختلفة تنتج أسماء مختلفة.";
  zhDict["createCommunity.composer.anonymousThreadStableDetail"] = "每个用户在每个帖子串中只有一个持续的匿名标签。不同帖子串产生不同标签。";
  arDict["createCommunity.composer.anonymousPostEphemeralLabel"] = "مؤقت-منشور";
  zhDict["createCommunity.composer.anonymousPostEphemeralLabel"] = "帖子临时";
  arDict["createCommunity.composer.anonymousPostEphemeralDetail"] = "اسم عشوائي لكل منشور. لا يوجد ارتباط بين المنشورات. يحد من قدرة الإشراف.";
  zhDict["createCommunity.composer.anonymousPostEphemeralDetail"] = "每个帖子随机标签。无跨帖子关联。限制 moderation 和标记能力。";
  arDict["createCommunity.composer.anonymousPostEphemeralDisabled"] = "نطاق المنشور المؤقت غير متاح في v0.";
  zhDict["createCommunity.composer.anonymousPostEphemeralDisabled"] = "帖子临时范围在 v0 中不可用。";
  arDict["createCommunity.composer.savedImage"] = "صورة محفوظة";
  zhDict["createCommunity.composer.savedImage"] = "已保存图片";
  arDict["createCommunity.composer.generatedDefault"] = "التوليد الافتراضي";
  zhDict["createCommunity.composer.generatedDefault"] = "生成的默认值";
  arDict["createCommunity.composer.enabled"] = "مُفعّل";
  zhDict["createCommunity.composer.enabled"] = "已启用";
  arDict["createCommunity.composer.disabled"] = "معطّل";
  zhDict["createCommunity.composer.disabled"] = "已禁用";
  arDict["createCommunity.composer.none"] = "لا شيء";
  zhDict["createCommunity.composer.none"] = "无";
  arDict["createCommunity.composer.remove"] = "إزالة";
  zhDict["createCommunity.composer.remove"] = "移除";
  arDict["createCommunity.composer.chooseFile"] = "اختر ملفًا";
  zhDict["createCommunity.composer.chooseFile"] = "选择文件";
  arDict["createCommunity.composer.replace"] = "استبدل";
  zhDict["createCommunity.composer.replace"] = "替换";
  arDict["createCommunity.composer.uploadPrompt"] = "لم يتم اختيار ملف";
  zhDict["createCommunity.composer.uploadPrompt"] = "尚未选择文件";
  arDict["createCommunity.composer.avatarUploadHelp"] = "PNG، JPG، WebP";
  zhDict["createCommunity.composer.avatarUploadHelp"] = "PNG、JPG、WebP";
  arDict["createCommunity.composer.bannerUploadHelp"] = "PNG، JPG، WebP";
  zhDict["createCommunity.composer.bannerUploadHelp"] = "PNG、JPG、WebP";
  arDict["createCommunity.composer.searchCountry"] = "ابحث عن دولة";
  zhDict["createCommunity.composer.searchCountry"] = "搜索国家";
  arDict["createCommunity.composer.noCountriesFound"] = "لم يتم العثور على دول.";
  zhDict["createCommunity.composer.noCountriesFound"] = "未找到国家。";

  // ========== MODERATION ==========
  arDict["moderation.shell.searchToolsPlaceholder"] = "ابحث في الأدوات";
  zhDict["moderation.shell.searchToolsPlaceholder"] = "搜索工具";
  arDict["moderation.shell.communityLabelFallback"] = "أدوات المشرف";
  zhDict["moderation.shell.communityLabelFallback"] = "版主工具";
  arDict["moderation.index.title"] = "أدوات الإشراف";
  zhDict["moderation.index.title"] = "管理工具";
  arDict["moderation.index.backLabel"] = "رجوع";
  zhDict["moderation.index.backLabel"] = "返回";
  arDict["moderation.nav.profile"] = "الملف الشخصي";
  zhDict["moderation.nav.profile"] = "个人资料";
  arDict["moderation.nav.rules"] = "القواعد";
  zhDict["moderation.nav.rules"] = "规则";
  arDict["moderation.nav.links"] = "الروابط";
  zhDict["moderation.nav.links"] = "链接";
  arDict["moderation.nav.labels"] = "التسميات";
  zhDict["moderation.nav.labels"] = "标签";
  arDict["moderation.nav.donations"] = "التبرعات";
  zhDict["moderation.nav.donations"] = "捐赠";
  arDict["moderation.nav.pricing"] = "التسعير";
  zhDict["moderation.nav.pricing"] = "定价";
  arDict["moderation.nav.gates"] = "البوابات";
  zhDict["moderation.nav.gates"] = "门槛";
  arDict["moderation.nav.safety"] = "الأمان";
  zhDict["moderation.nav.safety"] = "安全";
  arDict["moderation.nav.agents"] = "الوكلاء";
  zhDict["moderation.nav.agents"] = "代理";
  arDict["moderation.nav.machineAccess"] = "وصول الآلات";
  zhDict["moderation.nav.machineAccess"] = "机器访问";
  arDict["moderation.nav.namespace"] = "التحقق من مساحة الاسم";
  zhDict["moderation.nav.namespace"] = "命名空间验证";
  arDict["moderation.nav.communitySection"] = "المجتمع";
  zhDict["moderation.nav.communitySection"] = "社区";
  arDict["moderation.nav.accessSection"] = "الوصول";
  zhDict["moderation.nav.accessSection"] = "访问";
  arDict["moderation.nav.verificationSection"] = "التحقق";
  zhDict["moderation.nav.verificationSection"] = "验证";

  arDict["moderation.rules.title"] = "إنشاء قاعدة";
  zhDict["moderation.rules.title"] = "创建规则";
  arDict["moderation.rules.description"] = "تحدد القواعد التوقعات للأعضاء والزوار في مجتمعك.";
  zhDict["moderation.rules.description"] = "规则为社区中的成员和访客设定期望。";
  arDict["moderation.rules.namePlaceholder"] = "اسم القاعدة";
  zhDict["moderation.rules.namePlaceholder"] = "规则名称";
  arDict["moderation.rules.maxChars100"] = "الحد الأقصى 100 حرف";
  zhDict["moderation.rules.maxChars100"] = "最多 100 个字符";
  arDict["moderation.rules.descriptionPlaceholder"] = "الوصف";
  zhDict["moderation.rules.descriptionPlaceholder"] = "描述";
  arDict["moderation.rules.maxChars500"] = "الحد الأقصى 500 حرف";
  zhDict["moderation.rules.maxChars500"] = "最多 500 个字符";
  arDict["moderation.rules.reportingTitle"] = "الإبلاغ";
  zhDict["moderation.rules.reportingTitle"] = "举报";
  arDict["moderation.rules.reportingDescription"] = "يمكن للمستخدمين أو المشرفين اختيار سبب إبلاغ عند الإبلاغ عن محتوى.";
  zhDict["moderation.rules.reportingDescription"] = "用户或版主在举报内容时可以选择举报原因。";
  arDict["moderation.rules.reportReasonPlaceholder"] = "سبب الإبلاغ";
  zhDict["moderation.rules.reportReasonPlaceholder"] = "举报原因";
  arDict["moderation.rules.reportReasonHint"] = "افتراضيًا، هذا هو نفس اسم قاعدتك.";
  zhDict["moderation.rules.reportReasonHint"] = "默认情况下，这与你的规则名称相同。";

  arDict["moderation.labels.title"] = "التسميات";
  zhDict["moderation.labels.title"] = "标签";
  arDict["moderation.labels.enableLabel"] = "تفعيل التسميات";
  zhDict["moderation.labels.enableLabel"] = "启用标签";
  arDict["moderation.labels.requireOnTopLevelPosts"] = "مطلوب في المنشورات الرئيسية";
  zhDict["moderation.labels.requireOnTopLevelPosts"] = "要求用于顶级帖子";
  arDict["moderation.labels.definitionsTitle"] = "التعريفات";
  zhDict["moderation.labels.definitionsTitle"] = "定义";
  arDict["moderation.labels.addLabel"] = "أضف تسمية";
  zhDict["moderation.labels.addLabel"] = "添加标签";
  arDict["moderation.labels.nameLabel"] = "الاسم";
  zhDict["moderation.labels.nameLabel"] = "名称";
  arDict["moderation.labels.namePlaceholder"] = "اسم التسمية";
  zhDict["moderation.labels.namePlaceholder"] = "标签名称";
  arDict["moderation.labels.colorLabel"] = "اللون";
  zhDict["moderation.labels.colorLabel"] = "颜色";
  arDict["moderation.labels.archiveLabel"] = "أرشفة {label}";
  zhDict["moderation.labels.archiveLabel"] = "归档 {label}";
  arDict["moderation.labels.deleteLabel"] = "حذف {label}";
  zhDict["moderation.labels.deleteLabel"] = "删除 {label}";
  arDict["moderation.labels.emptyState"] = "لا توجد تسميات محددة.";
  zhDict["moderation.labels.emptyState"] = "未定义标签。";
  arDict["moderation.labels.archivedTitle"] = "مؤرشف";
  zhDict["moderation.labels.archivedTitle"] = "已归档";
  arDict["moderation.labels.restoreLabel"] = "استعادة {label}";
  zhDict["moderation.labels.restoreLabel"] = "恢复 {label}";
  arDict["moderation.labels.previewFallback"] = "معاينة";
  zhDict["moderation.labels.previewFallback"] = "预览";

  arDict["moderation.links.title"] = "الروابط";
  zhDict["moderation.links.title"] = "链接";
  arDict["moderation.links.addLink"] = "أضف رابطًا";
  zhDict["moderation.links.addLink"] = "添加链接";
  arDict["moderation.links.platformLabel"] = "المنصة";
  zhDict["moderation.links.platformLabel"] = "平台";
  arDict["moderation.links.labelLabel"] = "التسمية";
  zhDict["moderation.links.labelLabel"] = "标签";
  arDict["moderation.links.displayNamePlaceholder"] = "اسم العرض";
  zhDict["moderation.links.displayNamePlaceholder"] = "显示名称";
  arDict["moderation.links.urlLabel"] = "الرابط";
  zhDict["moderation.links.urlLabel"] = "链接";
  arDict["moderation.links.emptyState"] = "لا توجد روابط بعد.";
  zhDict["moderation.links.emptyState"] = "还没有链接。";

  arDict["moderation.pricing.title"] = "التسعير";
  zhDict["moderation.pricing.title"] = "定价";
  arDict["moderation.pricing.loadStarterTemplate"] = "استخدم خريطة الأسعار الافتراضية";
  zhDict["moderation.pricing.loadStarterTemplate"] = "使用默认价格表";
  arDict["moderation.pricing.regionalPricingLabel"] = "التسعير الإقليمي";
  zhDict["moderation.pricing.regionalPricingLabel"] = "区域定价";
  arDict["moderation.pricing.regionalPricingDescription"] = "يدفع المشترون بدون جنسية موثقة السعر الافتراضي.";
  zhDict["moderation.pricing.regionalPricingDescription"] = "未验证国籍的买家支付默认价格。";
  arDict["moderation.pricing.priceGroupsTitle"] = "مجموعات الأسعار";
  zhDict["moderation.pricing.priceGroupsTitle"] = "价格组";
  arDict["moderation.pricing.addPriceGroup"] = "أضف مجموعة سعر";
  zhDict["moderation.pricing.addPriceGroup"] = "添加价格组";
  arDict["moderation.pricing.defaultTierTitle"] = "المجموعة الافتراضية";
  zhDict["moderation.pricing.defaultTierTitle"] = "默认组";
  arDict["moderation.pricing.selectDefaultTierPlaceholder"] = "اختر المجموعة الافتراضية";
  zhDict["moderation.pricing.selectDefaultTierPlaceholder"] = "选择默认组";
  arDict["moderation.pricing.starterTemplateNote"] = "تخصص الخريطة الافتراضية كل دولة عبر نطاقات سعرية واسعة. راجع كل مجموعة قبل الحفظ.";
  zhDict["moderation.pricing.starterTemplateNote"] = "默认表将每个国家分配到广泛的价格区间。保存前请检查每个组。";
  arDict["moderation.pricing.existingListingsNote"] = "تفعيل التسعير الإقليمي يؤثر على القوائم الجديدة فقط. القوائم الحالية تحتفظ بإعداداتها الحالية.";
  zhDict["moderation.pricing.existingListingsNote"] = "启用区域定价仅影响新上架。现有上架保持当前设置。";
  arDict["moderation.pricing.groupNameLabel"] = "المجموعة";
  zhDict["moderation.pricing.groupNameLabel"] = "组";
  arDict["moderation.pricing.groupNamePlaceholder"] = "قياسي";
  zhDict["moderation.pricing.groupNamePlaceholder"] = "标准";
  arDict["moderation.pricing.basePricePreviewLabel"] = "معاينة السعر الأساسي";
  zhDict["moderation.pricing.basePricePreviewLabel"] = "基础价格预览";
  arDict["moderation.pricing.priceAdjustmentLabel"] = "تعديل السعر";
  zhDict["moderation.pricing.priceAdjustmentLabel"] = "价格调整";
  arDict["moderation.pricing.priceAdjustmentPlaceholder"] = "0";
  zhDict["moderation.pricing.priceAdjustmentPlaceholder"] = "0";
  arDict["moderation.pricing.previewPriceLabel"] = "معاينة السعر";
  zhDict["moderation.pricing.previewPriceLabel"] = "价格预览";
  arDict["moderation.pricing.countriesLabel"] = "الدول";
  zhDict["moderation.pricing.countriesLabel"] = "国家";

  // moderation.gates
  arDict["moderation.gates.title"] = "الوصول والبوابات";
  zhDict["moderation.gates.title"] = "访问与门槛";
  arDict["moderation.gates.membershipTitle"] = "العضوية";
  zhDict["moderation.gates.membershipTitle"] = "成员资格";
  arDict["moderation.gates.membershipOpenLabel"] = "مفتوح";
  zhDict["moderation.gates.membershipOpenLabel"] = "开放";
  arDict["moderation.gates.membershipOpenDetail"] = "يمكن لأي شخص الانضمام فورًا.";
  zhDict["moderation.gates.membershipOpenDetail"] = "任何人都可以立即加入。";
  arDict["moderation.gates.membershipRequestLabel"] = "طلب";
  zhDict["moderation.gates.membershipRequestLabel"] = "申请";
  arDict["moderation.gates.membershipRequestDetail"] = "يطلب المستخدمون الانضمام.";
  zhDict["moderation.gates.membershipRequestDetail"] = "用户申请加入。";
  arDict["moderation.gates.membershipGatedLabel"] = "مقيد";
  zhDict["moderation.gates.membershipGatedLabel"] = "受限";
  arDict["moderation.gates.membershipGatedDetail"] = "يتطلب الانضمام اجتياز بوابة واحدة أو أكثر.";
  zhDict["moderation.gates.membershipGatedDetail"] = "加入需要通过一个或多个门槛检查。";
  arDict["moderation.gates.gateChecksDescription"] = "اختر بوابة واحدة على الأقل قبل الحفظ.";
  zhDict["moderation.gates.gateChecksDescription"] = "保存前至少选择一个门槛。";
  arDict["moderation.gates.gateChecksTitle"] = "فحوصات البوابة";
  zhDict["moderation.gates.gateChecksTitle"] = "门槛检查";
  arDict["moderation.gates.nationalityDescription"] = "اشترط التحقق من الجنسية عبر Self.";
  zhDict["moderation.gates.nationalityDescription"] = "要求通过 Self 验证国籍。";
  arDict["moderation.gates.nationalityTitle"] = "التحقق من الجنسية";
  zhDict["moderation.gates.nationalityTitle"] = "国籍验证";
  arDict["moderation.gates.allowedNationalityLabel"] = "الجنسيات المسموح بها";
  zhDict["moderation.gates.allowedNationalityLabel"] = "允许的国籍";
  arDict["moderation.gates.selectValidCountry"] = "اختر دولة صالحة.";
  zhDict["moderation.gates.selectValidCountry"] = "选择一个有效的国家。";
  arDict["moderation.gates.minimumAgeTitle"] = "الحد الأدنى للعمر";
  zhDict["moderation.gates.minimumAgeTitle"] = "最低年龄";
  arDict["moderation.gates.minimumAgeDescription"] = "اشترط على الأعضاء إثبات أنهم يستوفون حد العمر المطلوب عبر Self.";
  zhDict["moderation.gates.minimumAgeDescription"] = "要求成员证明他们通过 Self 满足年龄门槛。";
  arDict["moderation.gates.minimumAgeLabel"] = "الحد الأدنى للعمر";
  zhDict["moderation.gates.minimumAgeLabel"] = "最低年龄";
  arDict["moderation.gates.minimumAgeInvalid"] = "أدخل عمرًا بين 18 و125.";
  zhDict["moderation.gates.minimumAgeInvalid"] = "输入 18 到 125 之间的年龄。";
  arDict["moderation.gates.walletScoreTitle"] = "درجة Passport";
  zhDict["moderation.gates.walletScoreTitle"] = "Passport 分数";
  arDict["moderation.gates.walletScoreDescription"] = "اشترط على الأعضاء تحقيق حد أدنى من درجة Human Passport.";
  zhDict["moderation.gates.walletScoreDescription"] = "要求成员达到 Human Passport 分数门槛。";
  arDict["moderation.gates.walletScoreLabel"] = "الدرجة الدنيا";
  zhDict["moderation.gates.walletScoreLabel"] = "最低分数";
  arDict["moderation.gates.walletScoreInvalid"] = "أدخل درجة بين 0 و100.";
  zhDict["moderation.gates.walletScoreInvalid"] = "输入 0 到 100 之间的分数。";
  arDict["moderation.gates.genderDescription"] = "اشترط علامة مستند Self على وثيقة موثقة.";
  zhDict["moderation.gates.genderDescription"] = "要求已验证文档上的 Self 文档标记。";
  arDict["moderation.gates.genderTitle"] = "علامة مستند Self";
  zhDict["moderation.gates.genderTitle"] = "Self 文档标记";
  arDict["moderation.gates.fMarkerLabel"] = "علامة F";
  zhDict["moderation.gates.fMarkerLabel"] = "F 标记";
  arDict["moderation.gates.fMarkerDetail"] = "اقبل فقط الأعضاء الذين علامة مستند Self لديهم هي F.";
  zhDict["moderation.gates.fMarkerDetail"] = "只接受 Self 文档标记为 F 的成员。";
  arDict["moderation.gates.mMarkerLabel"] = "علامة M";
  zhDict["moderation.gates.mMarkerLabel"] = "M 标记";
  arDict["moderation.gates.mMarkerDetail"] = "اقبل فقط الأعضاء الذين علامة مستند Self لديهم هي M.";
  zhDict["moderation.gates.mMarkerDetail"] = "只接受 Self 文档标记为 M 的成员。";
  arDict["moderation.gates.erc721Description"] = "اشترط محفظة Ethereum مرتبطة تحمل مجموعة ERC-721 معينة.";
  zhDict["moderation.gates.erc721Description"] = "要求持有特定 ERC-721 藏品的已关联 Ethereum 钱包。";
  arDict["moderation.gates.erc721Title"] = "مجموعة Ethereum NFT";
  zhDict["moderation.gates.erc721Title"] = "Ethereum NFT 藏品";
  arDict["moderation.gates.collectionContractLabel"] = "عقد المجموعة";
  zhDict["moderation.gates.collectionContractLabel"] = "藏品合约";
  arDict["moderation.gates.collectionContractPlaceholder"] = "0x...";
  zhDict["moderation.gates.collectionContractPlaceholder"] = "0x...";
  arDict["moderation.gates.invalidContractAddress"] = "أدخل عنوان عقد Ethereum صالح.";
  zhDict["moderation.gates.invalidContractAddress"] = "输入有效的 Ethereum 合约地址。";
  arDict["moderation.gates.readingTitle"] = "القراءة";
  zhDict["moderation.gates.readingTitle"] = "阅读";
  arDict["moderation.gates.readAccessPublicLabel"] = "عام";
  zhDict["moderation.gates.readAccessPublicLabel"] = "公开";
  arDict["moderation.gates.readAccessPublicDetail"] = "يمكن لأي شخص قراءة المنشورات.";
  zhDict["moderation.gates.readAccessPublicDetail"] = "任何人都可以阅读帖子。";
  arDict["moderation.gates.readAccessMembersOnlyLabel"] = "للأعضاء فقط";
  zhDict["moderation.gates.readAccessMembersOnlyLabel"] = "仅成员";
  arDict["moderation.gates.readAccessMembersOnlyDetail"] = "يمكن للأعضاء المنضمين فقط قراءة المنشورات.";
  zhDict["moderation.gates.readAccessMembersOnlyDetail"] = "只有已加入的成员可以阅读帖子。";
  arDict["moderation.gates.identityAndAccessTitle"] = "الهوية والوصول";
  zhDict["moderation.gates.identityAndAccessTitle"] = "身份与访问";
  arDict["moderation.gates.allowAnonymousPosting"] = "السماح بالنشر المجهول";
  zhDict["moderation.gates.allowAnonymousPosting"] = "允许匿名发帖";
  arDict["moderation.gates.anonymousScopeLabel"] = "نطاق المجهول";
  zhDict["moderation.gates.anonymousScopeLabel"] = "匿名范围";
  arDict["moderation.gates.anonymousScopeCommunityStableLabel"] = "مستقر-مجتمع";
  zhDict["moderation.gates.anonymousScopeCommunityStableLabel"] = "社区稳定";
  arDict["moderation.gates.anonymousScopeCommunityStableDetail"] = "اسم مجهول ثابت واحد لكل مستخدم عبر المجتمع.";
  zhDict["moderation.gates.anonymousScopeCommunityStableDetail"] = "每个用户在整个社区中只有一个持续的匿名标签。";
  arDict["moderation.gates.anonymousScopeThreadStableLabel"] = "مستقر-موضوع";
  zhDict["moderation.gates.anonymousScopeThreadStableLabel"] = "帖子稳定";
  arDict["moderation.gates.anonymousScopeThreadStableDetail"] = "اسم مجهول ثابت واحد لكل مستخدم لكل موضوع.";
  zhDict["moderation.gates.anonymousScopeThreadStableDetail"] = "每个用户在每个帖子串中只有一个持续的匿名标签。";
  arDict["moderation.gates.anonymousScopePostEphemeralLabel"] = "مؤقت-منشور";
  zhDict["moderation.gates.anonymousScopePostEphemeralLabel"] = "帖子临时";
  arDict["moderation.gates.anonymousScopePostEphemeralDetail"] = "اسم عشوائي لكل منشور. يحد من استمرارية الإشراف.";
  zhDict["moderation.gates.anonymousScopePostEphemeralDetail"] = "每个帖子随机标签。限制 moderation 连续性。";
  arDict["moderation.gates.anonymousScopePostEphemeralDisabledHint"] = "نطاق المنشور المؤقت غير متاح في v0.";
  zhDict["moderation.gates.anonymousScopePostEphemeralDisabledHint"] = "帖子临时范围在 v0 中不可用。";
  arDict["moderation.gates.ageGateLabel"] = "محتوى للبالغين (18+)";
  zhDict["moderation.gates.ageGateLabel"] = "成人内容（18+）";
  arDict["moderation.gates.ageGateWarning"] = "يجب على المالك إكمال التحقق من العمر قبل وضع علامة على المجتمع على أنه للبالغين.";
  zhDict["moderation.gates.ageGateWarning"] = "所有者必须完成年龄验证，才能将社区标记为成人内容。";

  // moderation.donations
  arDict["moderation.donations.title"] = "الجهة الخيرية";
  zhDict["moderation.donations.title"] = "慈善机构";
  arDict["moderation.donations.charityUrlLabel"] = "رابط الجهة الخيرية";
  zhDict["moderation.donations.charityUrlLabel"] = "慈善链接";
  arDict["moderation.donations.charityUrlPlaceholder"] = "https://app.endaoment.org/orgs/...";
  zhDict["moderation.donations.charityUrlPlaceholder"] = "https://app.endaoment.org/orgs/...";
  arDict["moderation.donations.loadCharity"] = "تحميل الجهة الخيرية";
  zhDict["moderation.donations.loadCharity"] = "加载慈善机构";

  // moderation.profile
  arDict["moderation.profile.appearanceTitle"] = "المظهر";
  zhDict["moderation.profile.appearanceTitle"] = "外观";
  arDict["moderation.profile.removeAvatar"] = "إزالة الصورة الشخصية";
  zhDict["moderation.profile.removeAvatar"] = "移除头像";
  arDict["moderation.profile.replaceAvatar"] = "استبدال الصورة الشخصية";
  zhDict["moderation.profile.replaceAvatar"] = "更换头像";
  arDict["moderation.profile.uploadAvatar"] = "رفع صورة شخصية";
  zhDict["moderation.profile.uploadAvatar"] = "上传头像";
  arDict["moderation.profile.avatarTitle"] = "الصورة الشخصية";
  zhDict["moderation.profile.avatarTitle"] = "头像";
  arDict["moderation.profile.removeCover"] = "إزالة الغلاف";
  zhDict["moderation.profile.removeCover"] = "移除封面";
  arDict["moderation.profile.replaceCover"] = "استبدال الغلاف";
  zhDict["moderation.profile.replaceCover"] = "更换封面";
  arDict["moderation.profile.uploadCover"] = "رفع غلاف";
  zhDict["moderation.profile.uploadCover"] = "上传封面";
  arDict["moderation.profile.coverTitle"] = "صورة الغلاف";
  zhDict["moderation.profile.coverTitle"] = "封面照片";
  arDict["moderation.profile.profileTitle"] = "الملف الشخصي";
  zhDict["moderation.profile.profileTitle"] = "个人资料";
  arDict["moderation.profile.nameLabel"] = "الاسم";
  zhDict["moderation.profile.nameLabel"] = "名称";
  arDict["moderation.profile.descriptionLabel"] = "الوصف";
  zhDict["moderation.profile.descriptionLabel"] = "描述";
  arDict["moderation.profile.backLabel"] = "رجوع";
  zhDict["moderation.profile.backLabel"] = "返回";
  arDict["moderation.profile.saveProfile"] = "حفظ الملف الشخصي";
  zhDict["moderation.profile.saveProfile"] = "保存个人资料";

  // moderation.safety
  arDict["moderation.safety.title"] = "الأمان";
  zhDict["moderation.safety.title"] = "安全";
  arDict["moderation.safety.description"] = "ضبط كيفية تأثير فحص الإشراف عبر OpenAI على تصفية المجتمع والمراجعة.";
  zhDict["moderation.safety.description"] = "调整 OpenAI 审核检查如何影响社区过滤和审查。";
  arDict["moderation.safety.openAiNote"] = "مدخل المصنف فقط. سياسة المجتمع تبقى صاحبة القرار النهائي.";
  zhDict["moderation.safety.openAiNote"] = "仅分类器输入。社区政策仍是最终决策者。";
  arDict["moderation.safety.openAiTitle"] = "فحص الإشراف عبر OpenAI";
  zhDict["moderation.safety.openAiTitle"] = "OpenAI 审核检查";
  arDict["moderation.safety.scanTitles"] = "فحص العناوين";
  zhDict["moderation.safety.scanTitles"] = "扫描标题";
  arDict["moderation.safety.scanPostBodies"] = "فحص نصوص المنشورات";
  zhDict["moderation.safety.scanPostBodies"] = "扫描帖子正文";
  arDict["moderation.safety.scanCaptions"] = "فحص التعليقات";
  zhDict["moderation.safety.scanCaptions"] = "扫描说明";
  arDict["moderation.safety.scanLinkPreviewText"] = "فحص نص معاينة الرابط";
  zhDict["moderation.safety.scanLinkPreviewText"] = "扫描链接预览文本";
  arDict["moderation.safety.scanImages"] = "فحص الصور المرفوعة";
  zhDict["moderation.safety.scanImages"] = "扫描上传的图片";
  arDict["moderation.safety.adultContentTitle"] = "محتوى للبالغين";
  zhDict["moderation.safety.adultContentTitle"] = "成人内容";
  arDict["moderation.safety.suggestiveLabel"] = "إيحائي";
  zhDict["moderation.safety.suggestiveLabel"] = "暗示性";
  arDict["moderation.safety.artisticNudityLabel"] = "عري فني";
  zhDict["moderation.safety.artisticNudityLabel"] = "艺术裸体";
  arDict["moderation.safety.explicitNudityLabel"] = "عري صريح";
  zhDict["moderation.safety.explicitNudityLabel"] = "明确裸体";
  arDict["moderation.safety.explicitSexualContentLabel"] = "محتوى جنسي صريح";
  zhDict["moderation.safety.explicitSexualContentLabel"] = "明确色情内容";
  arDict["moderation.safety.fetishContentLabel"] = "محتوى fetish";
  zhDict["moderation.safety.fetishContentLabel"] = "恋物内容";
  arDict["moderation.safety.graphicContentTitle"] = "محتوى رسومي";
  zhDict["moderation.safety.graphicContentTitle"] = "血腥内容";
  arDict["moderation.safety.injuryMedicalLabel"] = "إصابة أو محتوى طبي";
  zhDict["moderation.safety.injuryMedicalLabel"] = "受伤或医疗内容";
  arDict["moderation.safety.goreLabel"] = "دماء";
  zhDict["moderation.safety.goreLabel"] = "血腥";
  arDict["moderation.safety.extremeGoreLabel"] = "دماء مفرطة";
  zhDict["moderation.safety.extremeGoreLabel"] = "极端血腥";
  arDict["moderation.safety.bodyHorrorLabel"] = "رعب جسدي أو محتوى مزعج";
  zhDict["moderation.safety.bodyHorrorLabel"] = "身体恐怖或令人不安的内容";
  arDict["moderation.safety.animalHarmLabel"] = "إيذاء الحيوانات";
  zhDict["moderation.safety.animalHarmLabel"] = "伤害动物";
  arDict["moderation.safety.civilityTitle"] = "اللياقة";
  zhDict["moderation.safety.civilityTitle"] = "文明";
  arDict["moderation.safety.groupDirectedDemeaningLabel"] = "لغة مهينة موجهة للجماعات";
  zhDict["moderation.safety.groupDirectedDemeaningLabel"] = "针对群体的贬低语言";
  arDict["moderation.safety.targetedInsultsLabel"] = "إهانات موجهة";
  zhDict["moderation.safety.targetedInsultsLabel"] = "针对性侮辱";
  arDict["moderation.safety.targetedHarassmentLabel"] = "تحرش موجه";
  zhDict["moderation.safety.targetedHarassmentLabel"] = "针对性骚扰";
  arDict["moderation.safety.threateningLanguageLabel"] = "لغة تهديد";
  zhDict["moderation.safety.threateningLanguageLabel"] = "威胁性语言";
  arDict["moderation.safety.allowOption"] = "السماح";
  zhDict["moderation.safety.allowOption"] = "允许";
  arDict["moderation.safety.reviewOption"] = "المراجعة";
  zhDict["moderation.safety.reviewOption"] = "审核";
  arDict["moderation.safety.disallowOption"] = "المنع";
  zhDict["moderation.safety.disallowOption"] = "禁止";

  // moderation.agents
  arDict["moderation.agents.title"] = "الوكلاء";
  zhDict["moderation.agents.title"] = "代理";
  arDict["moderation.agents.description"] = "التحكم فيما إذا كان الوكلاء المملوكة للمستخدمين يمكنهم النشر في هذا المجتمع.";
  zhDict["moderation.agents.description"] = "控制用户拥有的代理是否可以在本社区发帖。";
  arDict["moderation.agents.saveLabel"] = "حفظ";
  zhDict["moderation.agents.saveLabel"] = "保存";
  arDict["moderation.agents.policySection"] = "السياسة";
  zhDict["moderation.agents.policySection"] = "政策";
  arDict["moderation.agents.postingPolicyLabel"] = "سياسة النشر";
  zhDict["moderation.agents.postingPolicyLabel"] = "发帖政策";
  arDict["moderation.agents.postingScopeLabel"] = "نطاق النشر";
  zhDict["moderation.agents.postingScopeLabel"] = "发帖范围";
  arDict["moderation.agents.ownershipProvidersTitle"] = "مزودو الملكية";
  zhDict["moderation.agents.ownershipProvidersTitle"] = "所有权提供方";
  arDict["moderation.agents.dailyCapsTitle"] = "الحدود اليومية";
  zhDict["moderation.agents.dailyCapsTitle"] = "每日上限";
  arDict["moderation.agents.agentPostsPerDayLabel"] = "منشورات الوكيل يوميًا";
  zhDict["moderation.agents.agentPostsPerDayLabel"] = "代理每日发帖数";
  arDict["moderation.agents.agentRepliesPerDayLabel"] = "ردود الوكيل يوميًا";
  zhDict["moderation.agents.agentRepliesPerDayLabel"] = "代理每日回复数";
  arDict["moderation.agents.policyDisallow"] = "منع";
  zhDict["moderation.agents.policyDisallow"] = "禁止";
  arDict["moderation.agents.policyAllow"] = "السماح";
  zhDict["moderation.agents.policyAllow"] = "允许";
  arDict["moderation.agents.scopeRepliesOnly"] = "الردود فقط";
  zhDict["moderation.agents.scopeRepliesOnly"] = "仅回复";
  arDict["moderation.agents.scopeTopLevelAndReplies"] = "المنشورات الرئيسية والردود";
  zhDict["moderation.agents.scopeTopLevelAndReplies"] = "顶级帖子和回复";
  arDict["moderation.agents.providerClawKey"] = "ClawKey";
  zhDict["moderation.agents.providerClawKey"] = "ClawKey";
  arDict["moderation.agents.providerSelfAgentId"] = "معرّف وكيل Self";
  zhDict["moderation.agents.providerSelfAgentId"] = "Self 代理 ID";
  arDict["moderation.agents.perDaySuffix"] = "/ يوم";
  zhDict["moderation.agents.perDaySuffix"] = "/ 天";
  arDict["moderation.agents.nonePlaceholder"] = "لا شيء";
  zhDict["moderation.agents.nonePlaceholder"] = "无";

  // moderation.saveFooter
  arDict["moderation.saveFooter.defaultSaveLabel"] = "حفظ";
  zhDict["moderation.saveFooter.defaultSaveLabel"] = "保存";

  // moderation.namespaceVerification
  arDict["moderation.namespaceVerification.title"] = "التحقق من مساحة الاسم";
  zhDict["moderation.namespaceVerification.title"] = "验证命名空间";
  arDict["moderation.namespaceVerification.description"] = "أرفق مسارًا موثقًا بهذا المجتمع.";
  zhDict["moderation.namespaceVerification.description"] = "为此社区附加已验证的路由。";
  arDict["moderation.namespaceVerification.doneLabel"] = "تم";
  zhDict["moderation.namespaceVerification.doneLabel"] = "完成";
  arDict["moderation.namespaceVerification.resuming"] = "استئناف التحقق...";
  zhDict["moderation.namespaceVerification.resuming"] = "继续验证中...";
  arDict["moderation.namespaceVerification.publishStepLabels[0]"] = "git clone";
  zhDict["moderation.namespaceVerification.publishStepLabels[0]"] = "git clone";
  arDict["moderation.namespaceVerification.publishStepLabels[1]"] = "cd";
  zhDict["moderation.namespaceVerification.publishStepLabels[1]"] = "cd";
  arDict["moderation.namespaceVerification.publishStepLabels[2]"] = "شغّل هذا";
  zhDict["moderation.namespaceVerification.publishStepLabels[2]"] = "运行此命令";
  arDict["moderation.namespaceVerification.digestLabel"] = "الملخص";
  zhDict["moderation.namespaceVerification.digestLabel"] = "摘要";
  arDict["moderation.namespaceVerification.challengeDetails"] = "تفاصيل التحدي";
  zhDict["moderation.namespaceVerification.challengeDetails"] = "挑战详情";
  arDict["moderation.namespaceVerification.verifyDifferent"] = "التحقق من مساحة اسم مختلفة";
  zhDict["moderation.namespaceVerification.verifyDifferent"] = "验证不同的命名空间";
  arDict["moderation.namespaceVerification.rootVerified"] = "تم التحقق من الجذر.";
  zhDict["moderation.namespaceVerification.rootVerified"] = "根已验证。";
  arDict["moderation.namespaceVerification.closeLabel"] = "إغلاق";
  zhDict["moderation.namespaceVerification.closeLabel"] = "关闭";
  arDict["moderation.namespaceVerification.checkSetup"] = "التحقق من الإعداد";
  zhDict["moderation.namespaceVerification.checkSetup"] = "检查设置";
  arDict["moderation.namespaceVerification.cancelLabel"] = "إلغاء";
  zhDict["moderation.namespaceVerification.cancelLabel"] = "取消";
  arDict["moderation.namespaceVerification.continueLabel"] = "متابعة";
  zhDict["moderation.namespaceVerification.continueLabel"] = "继续";
  arDict["moderation.namespaceVerification.newChallenge"] = "تحدي جديد";
  zhDict["moderation.namespaceVerification.newChallenge"] = "新挑战";
  arDict["moderation.namespaceVerification.getChallenge"] = "الحصول على تحدي";
  zhDict["moderation.namespaceVerification.getChallenge"] = "获取挑战";
  arDict["moderation.namespaceVerification.verifyAction"] = "تحقق";
  zhDict["moderation.namespaceVerification.verifyAction"] = "验证";
  arDict["moderation.namespaceVerification.routePreviewLabel"] = "المسار";
  zhDict["moderation.namespaceVerification.routePreviewLabel"] = "路由";
  arDict["moderation.namespaceVerification.invalidRootLabel"] = "جذر مساحة اسم غير صالح.";
  zhDict["moderation.namespaceVerification.invalidRootLabel"] = "无效的命名空间根。";
  arDict["moderation.namespaceVerification.hnsSetupNote"] = "ابدأ بإعداد nameserver عندما لا يكون الجذر يملك DNS تفويضي. أضف TXT فقط بعد أن يصبح المسار نشطًا.";
  zhDict["moderation.namespaceVerification.hnsSetupNote"] = "当根还没有权威 DNS 时，先从 nameserver 设置开始。只有在该路径上线后才添加 TXT。";
  arDict["moderation.namespaceVerification.family.handshakeLabel"] = "Handshake";
  zhDict["moderation.namespaceVerification.family.handshakeLabel"] = "Handshake";
  arDict["moderation.namespaceVerification.family.handshakeDetail"] = "قم بإعداد DNS أولاً، ثم تحقق من ملكية الجذر.";
  zhDict["moderation.namespaceVerification.family.handshakeDetail"] = "先设置 DNS，然后验证根所有权。";
  arDict["moderation.namespaceVerification.family.handshakeRootLabel"] = "جذر Handshake";
  zhDict["moderation.namespaceVerification.family.handshakeRootLabel"] = "Handshake 根";
  arDict["moderation.namespaceVerification.family.spacesLabel"] = "Spaces";
  zhDict["moderation.namespaceVerification.family.spacesLabel"] = "Spaces";
  arDict["moderation.namespaceVerification.family.spacesDetail"] = "تحقق من ملكية الجذر عن طريق نشر مسار.";
  zhDict["moderation.namespaceVerification.family.spacesDetail"] = "通过发布路由验证根所有权。";
  arDict["moderation.namespaceVerification.family.spacesRootLabel"] = "جذر Spaces";
  zhDict["moderation.namespaceVerification.family.spacesRootLabel"] = "Spaces 根";
  arDict["moderation.namespaceVerification.failure.expired"] = "انتهت صلاحية التحقق. أنشئ تحديًا جديدًا.";
  zhDict["moderation.namespaceVerification.failure.expired"] = "验证已过期。生成新挑战。";
  arDict["moderation.namespaceVerification.failure.dnsSetupRequired"] = "قم بإعداد nameservers أولاً، ثم قم بتحديث الجلسة.";
  zhDict["moderation.namespaceVerification.failure.dnsSetupRequired"] = "先设置 nameservers，然后刷新会话。";
  arDict["moderation.namespaceVerification.failure.hnsDefault"] = "تعذر التحقق من هذا الجذر. تحقق من سجل TXT وحاول مرة أخرى.";
  zhDict["moderation.namespaceVerification.failure.hnsDefault"] = "无法验证此根。检查 TXT 记录后重试。";
  arDict["moderation.namespaceVerification.failure.spacesDefault"] = "تعذر التحقق من هذا الجذر. تحقق من السجلات المنشورة وحاول مرة أخرى.";
  zhDict["moderation.namespaceVerification.failure.spacesDefault"] = "无法验证此根。检查已发布记录后重试。";
  arDict["moderation.namespaceVerification.hns.dnsSetupNote"] = "قم بإعداد nameservers أولاً. قيم TXT من جانب الأب لن تنشئ سجل _pirate.";
  zhDict["moderation.namespaceVerification.hns.dnsSetupNote"] = "先设置 nameservers。父级 TXT 值不会创建 _pirate 记录。";
  arDict["moderation.namespaceVerification.hns.txtPendingNote"] = "انتشار TXT لا يزال معلقًا.";
  zhDict["moderation.namespaceVerification.hns.txtPendingNote"] = "TXT 传播仍在等待中。";
  arDict["moderation.namespaceVerification.hns.txtVerifyNote"] = "أضف سجل TXT هذا على DNS التفويضي لديك، ثم تحقق.";
  zhDict["moderation.namespaceVerification.hns.txtVerifyNote"] = "在你的权威 DNS 上添加此 TXT 记录，然后验证。";
  arDict["moderation.namespaceVerification.hns.nameserversLabel"] = "Nameservers";
  zhDict["moderation.namespaceVerification.hns.nameserversLabel"] = "Nameservers";
  arDict["moderation.namespaceVerification.hns.nameserversNote"] = "حدّث سجلات NS للجذر حيث تدير Handshake الأب. بعد ذلك، سيعرض Pirate سجل TXT هنا.";
  zhDict["moderation.namespaceVerification.hns.nameserversNote"] = "在你管理 Handshake 父级的地方更新根的 NS 记录。之后，Pirate 会在这里显示 TXT 记录。";
  arDict["moderation.namespaceVerification.hns.challengeLabel"] = "التحدي";
  zhDict["moderation.namespaceVerification.hns.challengeLabel"] = "挑战";
  arDict["moderation.namespaceVerification.hns.hostLabel"] = "المضيف";
  zhDict["moderation.namespaceVerification.hns.hostLabel"] = "主机";
  arDict["moderation.namespaceVerification.hns.valueLabel"] = "القيمة";
  zhDict["moderation.namespaceVerification.hns.valueLabel"] = "值";
  arDict["moderation.namespaceVerification.shared.copied"] = "تم النسخ";
  zhDict["moderation.namespaceVerification.shared.copied"] = "已复制";
  arDict["moderation.namespaceVerification.shared.copyMessage"] = "نسخ الرسالة";
  zhDict["moderation.namespaceVerification.shared.copyMessage"] = "复制消息";

  // moderation.machineAccess (already mostly translated in zh, partially in ar)
  arDict["moderation.machineAccess.title"] = "وصول الآلات";
  zhDict["moderation.machineAccess.title"] = "机器访问";
  arDict["moderation.machineAccess.defaultNotice"] = "الأسطح العامة المرئية للبشر قابلة للقراءة بشكل منظم افتراضيًا.";
  zhDict["moderation.machineAccess.defaultNotice"] = "公开且人类可见的界面默认可被结构化读取。";
  arDict["moderation.machineAccess.surfacesTitle"] = "الاستثناءات";
  zhDict["moderation.machineAccess.surfacesTitle"] = "例外";
  arDict["moderation.machineAccess.communityIdentityLabel"] = "هوية المجتمع";
  zhDict["moderation.machineAccess.communityIdentityLabel"] = "社区身份";
  arDict["moderation.machineAccess.communityStatsLabel"] = "إحصائيات المجتمع";
  zhDict["moderation.machineAccess.communityStatsLabel"] = "社区统计";
  arDict["moderation.machineAccess.threadCardsLabel"] = "بطاقات النقاش";
  zhDict["moderation.machineAccess.threadCardsLabel"] = "主题卡片";
  arDict["moderation.machineAccess.threadBodiesLabel"] = "متون النقاش";
  zhDict["moderation.machineAccess.threadBodiesLabel"] = "主题正文";
  arDict["moderation.machineAccess.topCommentsLabel"] = "أبرز التعليقات";
  zhDict["moderation.machineAccess.topCommentsLabel"] = "热门评论";
  arDict["moderation.machineAccess.eventsLabel"] = "الأحداث";
  zhDict["moderation.machineAccess.eventsLabel"] = "事件";
  arDict["moderation.machineAccess.limitsTitle"] = "الحدود التشغيلية";
  zhDict["moderation.machineAccess.limitsTitle"] = "运行限制";
  arDict["moderation.machineAccess.anonymousRateLabel"] = "الوكلاء المجهولون";
  zhDict["moderation.machineAccess.anonymousRateLabel"] = "匿名代理";
  arDict["moderation.machineAccess.authenticatedRateLabel"] = "الوكلاء الموثقون";
  zhDict["moderation.machineAccess.authenticatedRateLabel"] = "已认证代理";
  arDict["moderation.machineAccess.topCommentsLimitLabel"] = "أبرز التعليقات لكل نقاش";
  zhDict["moderation.machineAccess.topCommentsLimitLabel"] = "每个主题的热门评论数";
  arDict["moderation.machineAccess.lowRateTier"] = "منخفض";
  zhDict["moderation.machineAccess.lowRateTier"] = "低";
  arDict["moderation.machineAccess.standardRateTier"] = "قياسي";
  zhDict["moderation.machineAccess.standardRateTier"] = "标准";
  arDict["moderation.machineAccess.allowedUsesTitle"] = "الاستخدامات المسموح بها";
  zhDict["moderation.machineAccess.allowedUsesTitle"] = "允许的用途";
  arDict["moderation.machineAccess.summarizationLabel"] = "التلخيص";
  zhDict["moderation.machineAccess.summarizationLabel"] = "摘要";
  arDict["moderation.machineAccess.analyticsLabel"] = "التحليلات";
  zhDict["moderation.machineAccess.analyticsLabel"] = "分析";
  arDict["moderation.machineAccess.aiTrainingLabel"] = "تدريب الذكاء الاصطناعي";
  zhDict["moderation.machineAccess.aiTrainingLabel"] = "AI 训练";
  arDict["moderation.machineAccess.allowedLabel"] = "مسموح";
  zhDict["moderation.machineAccess.allowedLabel"] = "允许";
  arDict["moderation.machineAccess.prohibitedLabel"] = "محظور";
  zhDict["moderation.machineAccess.prohibitedLabel"] = "禁止";
  arDict["moderation.machineAccess.memberOnlyNotice"] = "محتوى الأعضاء فقط يحتفظ بنفس البوابات ويتطلب وصولًا موثقًا.";
  zhDict["moderation.machineAccess.memberOnlyNotice"] = "仅会员内容保持相同门槛，并要求认证访问。";
  arDict["moderation.machineAccess.killSwitchNotice"] = "يمكن لمفاتيح الإيقاف في المنصة تعطيل مجتمع أو سطح أثناء الاستجابة للإساءة.";
  zhDict["moderation.machineAccess.killSwitchNotice"] = "平台可在滥用响应期间按社区或界面关闭访问。";
  arDict["moderation.machineAccess.policyOriginDefault"] = "هذه إعدادات افتراضية موروثة. احفظ فقط عندما يحتاج هذا المجتمع إلى استثناءات.";
  zhDict["moderation.machineAccess.policyOriginDefault"] = "这些是继承的默认值。仅在此社区需要例外时保存。";

  // Remaining small items that are identical by design
  arDict["home.subtitle"] = "";
  zhDict["home.subtitle"] = "";
  arDict["onboarding.placeholders.redditUsername"] = "technohippie";
  zhDict["onboarding.placeholders.redditUsername"] = "technohippie";
  arDict["onboarding.stepCount"] = "{current}/{total}";
  zhDict["onboarding.stepCount"] = "{current}/{total}";
  arDict["createPost.placeholders.unlockPrice"] = "1.00";
  zhDict["createPost.placeholders.unlockPrice"] = "1.00";
  arDict["createPost.placeholders.previewStartSeconds"] = "0";
  zhDict["createPost.placeholders.previewStartSeconds"] = "0";
  arDict["createPost.placeholders.url"] = "https://";
  zhDict["createPost.placeholders.url"] = "https://";

  // Apply translations
  for (const path of arMissing) {
    if (arDict[path] !== undefined) {
      setPath(ar, path, arDict[path]);
    }
  }
  for (const path of zhMissing) {
    if (zhDict[path] !== undefined) {
      setPath(zh, path, zhDict[path]);
    }
  }

  // Check remaining untranslated
  const arStillMissing = findUntranslated(en, ar);
  const zhStillMissing = findUntranslated(en, zh);
  console.log("AR still missing:", arStillMissing.length);
  console.log("ZH still missing:", zhStillMissing.length);
  if (arStillMissing.length > 0) {
    console.log("AR remaining:", arStillMissing);
  }
  if (zhStillMissing.length > 0) {
    console.log("ZH remaining:", zhStillMissing);
  }

  await writeJson(join(localesRoot, "ar", "routes.json"), ar);
  await writeJson(join(localesRoot, "zh", "routes.json"), zh);
  console.log("Done!");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
