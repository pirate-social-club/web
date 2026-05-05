import type { Community } from "@pirate/api-contracts";

export type VisualPolicyAction = "allow" | "queue" | "reject";
export type VisualPolicyDisclosureAction = "allow" | "allow_with_disclosure" | "queue" | "reject";

export type VisualPolicySettings = {
  topless: VisualPolicyAction;
  visibleNipples: VisualPolicyAction;
  visibleButtocks: VisualPolicyAction;
  visibleGenitals: VisualPolicyAction;
  bottomlessObscured: VisualPolicyAction;
  impliedSexualActivity: VisualPolicyAction;
  explicitSexualActivity: VisualPolicyAction;
  sexualizedContact: VisualPolicyAction;
  masturbation: VisualPolicyAction;
  oralSex: VisualPolicyAction;
  sexToyPackaging: VisualPolicyAction;
  sexToyVisible: VisualPolicyAction;
  sexToyInUse: VisualPolicyAction;
  animeManga: VisualPolicyAction;
  furryAnthro: VisualPolicyAction;
  fictionalNudity: VisualPolicyAction;
  fictionalExplicitSex: VisualPolicyAction;
  ambiguousFictionalAgeWithAdultContent: Exclude<VisualPolicyAction, "allow">;
  possibleMinorWithAdultContent: "reject";
  aiGeneratedImages: VisualPolicyAction;
  aiGeneratedAdultImages: VisualPolicyAction;
  deepfakeOrFaceSwapRisk: Exclude<VisualPolicyAction, "allow">;
  celebrityAdultLikeness: Exclude<VisualPolicyAction, "allow">;
  voyeuristicOrHiddenCamera: "reject";
  watermark: VisualPolicyAction;
  adultPlatformWatermark: VisualPolicyAction;
  productPromotion: VisualPolicyDisclosureAction;
  affiliateOrSalesLink: VisualPolicyDisclosureAction;
  qrCode: Exclude<VisualPolicyAction, "allow">;
  paymentHandle: Exclude<VisualPolicyAction, "allow">;
  urlsInImage: VisualPolicyAction;
  weapons: VisualPolicyAction;
  goreOrInjury: VisualPolicyAction;
  drugs: VisualPolicyAction;
  hateSymbols: Exclude<VisualPolicyAction, "allow">;
  personalDocuments: Exclude<VisualPolicyAction, "allow">;
  uncertainAgeWithAdultContent: Exclude<VisualPolicyAction, "allow">;
  lowQualityAdultImage: Exclude<VisualPolicyAction, "allow">;
  modelUncertain: Exclude<VisualPolicyAction, "allow">;
};

export type VisualClassifierFacts = {
  visualStyle: "photographic" | "anime_manga" | "furry_anthro" | "ai_generated" | "meme_screenshot";
  characterContext: "real_person" | "fictional_stylized" | "synthetic_realistic" | "anthro_furry";
  apparentAgeRisk: "adult" | "possible_minor" | "uncertain" | "not_applicable";
  nudity: "none" | "topless" | "lower_body_unclothed_obscured" | "buttocks_visible" | "genitals_visible";
  visibleNipples: boolean | "uncertain";
  sexualActivity: "none" | "implied" | "explicit";
  sexualizedContact: boolean | "uncertain";
  masturbation: boolean | "uncertain";
  oralSex: boolean | "uncertain";
  sexToy: "none" | "packaging_or_ad" | "visible_not_in_use" | "in_use" | "uncertain";
  voyeuristicOrHiddenCamera: boolean | "uncertain";
  commercialSignal: "none" | "watermark" | "adult_platform_watermark" | "product_promotion" | "payment_handle";
  syntheticRisk: "none" | "likely_ai_generated" | "deepfake_or_face_swap_risk" | "celebrity_adult_likeness";
  imageTextSignal: "none" | "url" | "qr_code" | "payment_handle";
  safetySignal: "none" | "weapons" | "gore_or_injury" | "drugs" | "hate_symbols" | "personal_documents";
  quality: "clear" | "low_quality" | "uncertain";
};

export type VisualPolicyResolvedDecision = {
  policyDecision: VisualPolicyAction;
  publishDecision: "allow" | "queue" | "reject";
  reasonCodes: string[];
};

export const adultToplessNonExplicitSettings: VisualPolicySettings = {
  topless: "allow",
  visibleNipples: "allow",
  visibleButtocks: "queue",
  visibleGenitals: "reject",
  bottomlessObscured: "queue",
  impliedSexualActivity: "queue",
  explicitSexualActivity: "reject",
  sexualizedContact: "reject",
  masturbation: "reject",
  oralSex: "reject",
  sexToyPackaging: "queue",
  sexToyVisible: "queue",
  sexToyInUse: "reject",
  animeManga: "allow",
  furryAnthro: "allow",
  fictionalNudity: "allow",
  fictionalExplicitSex: "reject",
  ambiguousFictionalAgeWithAdultContent: "queue",
  possibleMinorWithAdultContent: "reject",
  aiGeneratedImages: "allow",
  aiGeneratedAdultImages: "queue",
  deepfakeOrFaceSwapRisk: "reject",
  celebrityAdultLikeness: "reject",
  voyeuristicOrHiddenCamera: "reject",
  watermark: "allow",
  adultPlatformWatermark: "queue",
  productPromotion: "allow_with_disclosure",
  affiliateOrSalesLink: "allow_with_disclosure",
  qrCode: "queue",
  paymentHandle: "queue",
  urlsInImage: "queue",
  weapons: "reject",
  goreOrInjury: "reject",
  drugs: "queue",
  hateSymbols: "reject",
  personalDocuments: "queue",
  uncertainAgeWithAdultContent: "queue",
  lowQualityAdultImage: "queue",
  modelUncertain: "queue",
};

export const sampleVisualFacts: VisualClassifierFacts = {
  visualStyle: "photographic",
  characterContext: "real_person",
  apparentAgeRisk: "adult",
  nudity: "topless",
  visibleNipples: true,
  sexualActivity: "none",
  sexualizedContact: false,
  masturbation: false,
  oralSex: false,
  sexToy: "none",
  voyeuristicOrHiddenCamera: false,
  commercialSignal: "adult_platform_watermark",
  syntheticRisk: "none",
  imageTextSignal: "url",
  safetySignal: "none",
  quality: "clear",
};

export type ApiVisualPolicySettings = Omit<Community["visual_policy_settings"], "community" | "policy_origin">;

export function visualPolicySettingsFromApi(
  settings: Community["visual_policy_settings"] | null | undefined,
): VisualPolicySettings {
  if (!settings) {
    return adultToplessNonExplicitSettings;
  }

  return {
    topless: settings.topless,
    visibleNipples: settings.visible_nipples,
    visibleButtocks: settings.visible_buttocks,
    visibleGenitals: settings.visible_genitals,
    bottomlessObscured: settings.bottomless_obscured,
    impliedSexualActivity: settings.implied_sexual_activity,
    explicitSexualActivity: settings.explicit_sexual_activity,
    sexualizedContact: settings.sexualized_contact,
    masturbation: settings.masturbation,
    oralSex: settings.oral_sex,
    sexToyPackaging: settings.sex_toy_packaging,
    sexToyVisible: settings.sex_toy_visible,
    sexToyInUse: settings.sex_toy_in_use,
    animeManga: settings.anime_manga,
    furryAnthro: settings.furry_anthro,
    fictionalNudity: settings.fictional_nudity,
    fictionalExplicitSex: settings.fictional_explicit_sex,
    ambiguousFictionalAgeWithAdultContent: settings.ambiguous_fictional_age_with_adult_content,
    possibleMinorWithAdultContent: settings.possible_minor_with_adult_content,
    aiGeneratedImages: settings.ai_generated_images,
    aiGeneratedAdultImages: settings.ai_generated_adult_images,
    deepfakeOrFaceSwapRisk: settings.deepfake_or_face_swap_risk,
    celebrityAdultLikeness: settings.celebrity_adult_likeness,
    voyeuristicOrHiddenCamera: settings.voyeuristic_or_hidden_camera,
    watermark: settings.watermark,
    adultPlatformWatermark: settings.adult_platform_watermark,
    productPromotion: settings.product_promotion,
    affiliateOrSalesLink: settings.affiliate_or_sales_link,
    qrCode: settings.qr_code,
    paymentHandle: settings.payment_handle,
    urlsInImage: settings.urls_in_image,
    weapons: settings.weapons,
    goreOrInjury: settings.gore_or_injury,
    drugs: settings.drugs,
    hateSymbols: settings.hate_symbols,
    personalDocuments: settings.personal_documents,
    uncertainAgeWithAdultContent: settings.uncertain_age_with_adult_content,
    lowQualityAdultImage: settings.low_quality_adult_image,
    modelUncertain: settings.model_uncertain,
  };
}

export function visualPolicySettingsToApi(settings: VisualPolicySettings): ApiVisualPolicySettings {
  return {
    topless: settings.topless,
    visible_nipples: settings.visibleNipples,
    visible_buttocks: settings.visibleButtocks,
    visible_genitals: settings.visibleGenitals,
    bottomless_obscured: settings.bottomlessObscured,
    implied_sexual_activity: settings.impliedSexualActivity,
    explicit_sexual_activity: settings.explicitSexualActivity,
    sexualized_contact: settings.sexualizedContact,
    masturbation: settings.masturbation,
    oral_sex: settings.oralSex,
    sex_toy_packaging: settings.sexToyPackaging,
    sex_toy_visible: settings.sexToyVisible,
    sex_toy_in_use: settings.sexToyInUse,
    anime_manga: settings.animeManga,
    furry_anthro: settings.furryAnthro,
    fictional_nudity: settings.fictionalNudity,
    fictional_explicit_sex: settings.fictionalExplicitSex,
    ambiguous_fictional_age_with_adult_content: settings.ambiguousFictionalAgeWithAdultContent,
    possible_minor_with_adult_content: settings.possibleMinorWithAdultContent,
    ai_generated_images: settings.aiGeneratedImages,
    ai_generated_adult_images: settings.aiGeneratedAdultImages,
    deepfake_or_face_swap_risk: settings.deepfakeOrFaceSwapRisk,
    celebrity_adult_likeness: settings.celebrityAdultLikeness,
    voyeuristic_or_hidden_camera: settings.voyeuristicOrHiddenCamera,
    watermark: settings.watermark,
    adult_platform_watermark: settings.adultPlatformWatermark,
    product_promotion: settings.productPromotion,
    affiliate_or_sales_link: settings.affiliateOrSalesLink,
    qr_code: settings.qrCode,
    payment_handle: settings.paymentHandle,
    urls_in_image: settings.urlsInImage,
    weapons: settings.weapons,
    gore_or_injury: settings.goreOrInjury,
    drugs: settings.drugs,
    hate_symbols: settings.hateSymbols,
    personal_documents: settings.personalDocuments,
    uncertain_age_with_adult_content: settings.uncertainAgeWithAdultContent,
    low_quality_adult_image: settings.lowQualityAdultImage,
    model_uncertain: settings.modelUncertain,
  };
}

function actionSeverity(action: VisualPolicyAction | VisualPolicyDisclosureAction): number {
  if (action === "reject") return 3;
  if (action === "queue" || action === "allow_with_disclosure") return 2;
  return 1;
}

function stricterAction(left: VisualPolicyAction, right: VisualPolicyAction | VisualPolicyDisclosureAction): VisualPolicyAction {
  if (actionSeverity(right) > actionSeverity(left)) {
    return right === "allow_with_disclosure" ? "queue" : right;
  }
  return left;
}

export function resolveVisualPolicyDecision(
  settings: VisualPolicySettings,
  facts: VisualClassifierFacts,
): VisualPolicyResolvedDecision {
  let decision: VisualPolicyAction = "allow";
  const reasonCodes: string[] = [];

  function apply(action: VisualPolicyAction | VisualPolicyDisclosureAction, reason: string) {
    if (action !== "allow") {
      reasonCodes.push(reason);
    }
    decision = stricterAction(decision, action);
  }

  const hasAdultSignal = facts.nudity !== "none"
    || facts.visibleNipples === true
    || facts.sexualActivity !== "none"
    || facts.sexualizedContact === true
    || facts.masturbation === true
    || facts.oralSex === true
    || facts.sexToy === "visible_not_in_use"
    || facts.sexToy === "in_use";
  if (facts.apparentAgeRisk === "possible_minor" && hasAdultSignal) {
    apply(settings.possibleMinorWithAdultContent, "possible_minor_with_adult_content");
  }
  if (facts.apparentAgeRisk === "uncertain" && hasAdultSignal) {
    apply(settings.uncertainAgeWithAdultContent, "uncertain_age_with_adult_content");
  }
  if (facts.quality !== "clear" && hasAdultSignal) {
    apply(settings.lowQualityAdultImage, "low_quality_adult_image");
  }

  if (facts.visualStyle === "anime_manga") apply(settings.animeManga, "anime_manga");
  if (facts.visualStyle === "furry_anthro" || facts.characterContext === "anthro_furry") apply(settings.furryAnthro, "furry_anthro");
  if (facts.characterContext === "fictional_stylized" && facts.nudity !== "none") apply(settings.fictionalNudity, "fictional_nudity");
  if (facts.characterContext === "fictional_stylized" && facts.sexualActivity === "explicit") apply(settings.fictionalExplicitSex, "fictional_explicit_sex");

  if (facts.nudity === "topless") apply(settings.topless, "topless_nudity");
  if (facts.nudity === "lower_body_unclothed_obscured") apply(settings.bottomlessObscured, "bottomless_obscured");
  if (facts.nudity === "buttocks_visible") apply(settings.visibleButtocks, "visible_buttocks");
  if (facts.nudity === "genitals_visible") apply(settings.visibleGenitals, "visible_genitals");
  if (facts.visibleNipples === true) apply(settings.visibleNipples, "visible_nipples");

  if (facts.sexualActivity === "implied") apply(settings.impliedSexualActivity, "implied_sexual_activity");
  if (facts.sexualActivity === "explicit") apply(settings.explicitSexualActivity, "explicit_sexual_activity");
  if (facts.sexualizedContact === true) apply(settings.sexualizedContact, "sexualized_contact");
  if (facts.masturbation === true) apply(settings.masturbation, "masturbation");
  if (facts.oralSex === true) apply(settings.oralSex, "oral_sex");
  if (facts.sexToy === "packaging_or_ad") apply(settings.sexToyPackaging, "sex_toy_packaging");
  if (facts.sexToy === "visible_not_in_use") apply(settings.sexToyVisible, "sex_toy_visible");
  if (facts.sexToy === "in_use") apply(settings.sexToyInUse, "sex_toy_in_use");
  if (facts.voyeuristicOrHiddenCamera === true) apply(settings.voyeuristicOrHiddenCamera, "voyeuristic_or_hidden_camera");
  if (
    facts.visibleNipples === "uncertain"
    || facts.sexualizedContact === "uncertain"
    || facts.masturbation === "uncertain"
    || facts.oralSex === "uncertain"
    || facts.sexToy === "uncertain"
    || facts.voyeuristicOrHiddenCamera === "uncertain"
  ) {
    apply(settings.modelUncertain, "model_uncertain");
  }

  if (facts.syntheticRisk === "likely_ai_generated") apply(hasAdultSignal ? settings.aiGeneratedAdultImages : settings.aiGeneratedImages, "ai_generated");
  if (facts.syntheticRisk === "deepfake_or_face_swap_risk") apply(settings.deepfakeOrFaceSwapRisk, "deepfake_or_face_swap_risk");
  if (facts.syntheticRisk === "celebrity_adult_likeness") apply(settings.celebrityAdultLikeness, "celebrity_adult_likeness");

  if (facts.commercialSignal === "watermark") apply(settings.watermark, "watermark");
  if (facts.commercialSignal === "adult_platform_watermark") apply(settings.adultPlatformWatermark, "adult_platform_watermark");
  if (facts.commercialSignal === "product_promotion") apply(settings.productPromotion, "product_promotion");
  if (facts.commercialSignal === "payment_handle") apply(settings.paymentHandle, "payment_handle_commercial");
  if (facts.imageTextSignal === "url") apply(settings.urlsInImage, "url_in_image");
  if (facts.imageTextSignal === "qr_code") apply(settings.qrCode, "qr_code");
  if (facts.imageTextSignal === "payment_handle") apply(settings.paymentHandle, "payment_handle_ocr");

  if (facts.safetySignal === "weapons") apply(settings.weapons, "weapons");
  if (facts.safetySignal === "gore_or_injury") apply(settings.goreOrInjury, "gore_or_injury");
  if (facts.safetySignal === "drugs") apply(settings.drugs, "drugs");
  if (facts.safetySignal === "hate_symbols") apply(settings.hateSymbols, "hate_symbols");
  if (facts.safetySignal === "personal_documents") apply(settings.personalDocuments, "personal_documents");

  return {
    policyDecision: decision,
    publishDecision: decision === "allow" ? "allow" : decision,
    reasonCodes: [...new Set(reasonCodes)],
  };
}
