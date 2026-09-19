// Turn a mongoose ValidationError into { field: message } without echoing values
// or internal error text back to the client.
module.exports = function fieldErrors(err) {
  const out = {};
  for (const [path, e] of Object.entries(err.errors || {})) {
    const p = e.properties || {};
    switch (e.kind) {
      case 'required':  out[path] = 'is required'; break;
      case 'maxlength': out[path] = `must be at most ${p.maxlength} characters`; break;
      case 'enum':      out[path] = `must be one of: ${(p.enumValues || []).join(', ')}`; break;
      case 'regexp':    out[path] = p.message || 'has an invalid format'; break;
      case 'user defined':
      case 'invalid':   out[path] = p.message || 'is invalid'; break;   // our own validator messages
      default:          out[path] = 'has an invalid value';
    }
  }
  return out;
};
