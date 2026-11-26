// Drive the same visible button and native chooser as a person opening a recording.
module.exports=async function chooseVideo(page,file){
  const picker=page.waitForEvent('filechooser');
  await page.locator('#chooseVideo').click();
  await (await picker).setFiles(file);
};
