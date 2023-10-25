const API_ORIGIN = 'https://app.cohesive.workers.dev/raw';
const API_AUTH_PAYLOAD = {
  user : '',
  pass : '',
};

function callAPI(endpoint, data) {
  return UrlFetchApp.fetch(API_ORIGIN + endpoint, {
    'muteHttpExceptions': true,
    'method' : 'post',
    'contentType': 'application/json',
    'payload' : JSON.stringify({
      ...API_AUTH_PAYLOAD,
      ...data
    })
  })
    .getContentText()
    .trim();
}

function getTextCompletionReply(e) {
  const currentCell = e.range.activateAsCurrentCell();
  const value = currentCell.getValue();

  if(value.length === 0) return;

  currentCell.offset(0,1)
    .setBackground('#ffffcc')
    .setValue('...');
  
  // Logger.log(value);

  const answer = callAPI('/completion', {prompt: value});

  Logger.log(answer);
  
  currentCell.offset(0,1)
    .setBackground('#cccccc')
    .setWrap(true)
    .setValue(answer);
}

function getChatReply(e) {
  const currentCell = e.range.getCell(0,0);
  const value = currentCell.getValue();

  // Ignore headings
  if(currentCell.getFontWeight() === 'bold') return;
  if(value.length === 0) return;

  const systemMessage = e.range.getSheet().getRange('A2:A2').getValue().trim();

  currentCell.offset(0,1)
    .setBackground('#ffffcc')
    .setValue('...');
  
  // Logger.log(value);

  const answer = callAPI('/chat', {messages: [
    {role: 'system', content: systemMessage},
    {role: 'user', content: value}
  ]});

  Logger.log(answer);
  
  currentCell.offset(0,1)
    .setBackground('#cccccc')
    .setWrap(true)
    .setValue(answer);
}

function replyWithLLM(e) {
  const rangeSheet = range.getSheet();
  switch(rangeSheet.getName()){
    case 'Text completion testing (llama-2-chat-7b-q8)':
      return getTextCompletionReply(e);
    case 'Chat reply testing (llama-2-chat-7b-q8)':
      return getChatReply(e);
    default:
      Logger.log('Event ignored, not applicable to this sheet');
  }
}