/**
 * Voice utility for ALJOOYA SUBIDHA SERVICES
 */

export const speak = (text: string) => {
  if (!('speechSynthesis' in window)) return;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-IN'; 
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  
  const voices = window.speechSynthesis.getVoices();
  const indianVoice = voices.find(v => v.lang.includes('IN')) || voices.find(v => v.lang.includes('en'));
  if (indianVoice) utterance.voice = indianVoice;

  window.speechSynthesis.speak(utterance);
};

export const voiceFeedback = {
  success: () => speak("Operation Success"),
  login: (name: string) => speak(`Welcome back ${name}`),
  error: () => speak("Action Forbidden or system error"),
  payment: () => speak("Payment Received Successfully"),
  branchCreated: () => speak("Branch deployed successfully"),
  loanDisbursed: () => speak("Loan disbursed successfully"),
};
