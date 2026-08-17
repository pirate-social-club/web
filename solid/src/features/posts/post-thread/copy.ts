import type { FormattedTextareaToolbarLabels } from "../../../design-system";
import type { UiLocaleCode } from "../../../lib/ui-locale-core";

export interface PostThreadCommonCopy {
  cancelReply: string;
  collapseThread: string;
  commentSortLabel: string;
  commentsHeading: string;
  continueThread: string;
  downvoteComment: string;
  expandThread: string;
  noComments: string;
  replyAction: string;
  replyPlaceholder: string;
  submitReply: string;
  upvoteComment: string;
}

const englishCopy: PostThreadCommonCopy = {
  cancelReply: "Cancel",
  collapseThread: "Collapse thread",
  commentSortLabel: "Sort comments",
  commentsHeading: "Comments",
  continueThread: "Continue this thread",
  downvoteComment: "Downvote comment",
  expandThread: "Expand thread",
  noComments: "No comments yet.",
  replyAction: "Reply",
  replyPlaceholder: "Write a reply",
  submitReply: "Post reply",
  upvoteComment: "Upvote comment",
};

export function postThreadCommonCopy(locale: UiLocaleCode): PostThreadCommonCopy {
  if (locale === "ar") {
    return {
      cancelReply: "إلغاء",
      collapseThread: "طيّ النقاش",
      commentSortLabel: "ترتيب التعليقات",
      commentsHeading: "التعليقات",
      continueThread: "تابع هذا النقاش",
      downvoteComment: "التصويت السلبي على التعليق",
      expandThread: "وسّع النقاش",
      noComments: "لا توجد تعليقات بعد.",
      replyAction: "رد",
      replyPlaceholder: "اكتب ردًا",
      submitReply: "انشر الرد",
      upvoteComment: "التصويت الإيجابي على التعليق",
    };
  }
  if (locale === "zh") {
    return {
      cancelReply: "取消",
      collapseThread: "收起讨论串",
      commentSortLabel: "排序评论",
      commentsHeading: "评论",
      continueThread: "继续此讨论串",
      downvoteComment: "反对评论",
      expandThread: "展开讨论串",
      noComments: "还没有评论。",
      replyAction: "回复",
      replyPlaceholder: "写回复",
      submitReply: "发布回复",
      upvoteComment: "赞成评论",
    };
  }
  if (locale === "pseudo") {
    return Object.fromEntries(Object.entries(englishCopy).map(([key, value]) => [key, `[!! ${value} ::: ${value} !!]`])) as unknown as PostThreadCommonCopy;
  }
  return englishCopy;
}

/** Toolbar labels stay local to the composition until route copy exposes them. */
export function replyToolbarLabels(locale: UiLocaleCode): FormattedTextareaToolbarLabels {
  if (locale === "ar") {
    return {
      bold: "عريض",
      italic: "مائل",
      strike: "يتوسطه خط",
      quote: "اقتباس",
      link: "رابط",
      bulletList: "قائمة نقطية",
      orderedList: "قائمة مرقمة",
    };
  }
  if (locale === "zh") {
    return {
      bold: "粗体",
      italic: "斜体",
      strike: "删除线",
      quote: "引用",
      link: "链接",
      bulletList: "项目符号列表",
      orderedList: "编号列表",
    };
  }
  if (locale === "pseudo") {
    return {
      bold: "[!! Bold ::: Bold !!]",
      italic: "[!! Italic ::: Italic !!]",
      strike: "[!! Strikethrough ::: Strikethrough !!]",
      quote: "[!! Blockquote ::: Blockquote !!]",
      link: "[!! Link ::: Link !!]",
      bulletList: "[!! Bulleted list ::: Bulleted list !!]",
      orderedList: "[!! Numbered list ::: Numbered list !!]",
    };
  }
  return {
    bold: "Bold",
    italic: "Italic",
    strike: "Strikethrough",
    quote: "Blockquote",
    link: "Link",
    bulletList: "Bulleted list",
    orderedList: "Numbered list",
  };
}
