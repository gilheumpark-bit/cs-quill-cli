function doSomethingBad() {
  const isError = true;
  if (isError) {
    throw "This is an evil string exception"; // ERR-005 탐지 대상
  }
}
