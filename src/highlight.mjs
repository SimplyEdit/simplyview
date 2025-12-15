export function html(strings, ...values) {
  const outputArray = values.map(
    (value, index) =>
      `${strings[index]}${value}`,
  );
  return outputArray.join("") + strings[strings.length - 1];
}

export function css(strings, ...values) {
	return html(strings, ...values)
}
