import { authorizeConnectorOwner } from './_connector/ownerAuth.js';
import { parseConnectorBody, requirePost, ConnectorHttpError } from './_connector/http.js';
import { runConnectorHandler } from './_connector/handler.js';
export default async function connectorStatusHandler(request: any, response: any) { await runConnectorHandler(response, async () => {
  requirePost(request); const { body } = parseConnectorBody(request, 16*1024); const companyId=String(body.companyId??'');
  const { userId, service }=await authorizeConnectorOwner(request,companyId); const {data,error}=await service.rpc('app_owner_connector_status',{p_company_id:companyId,p_user_id:userId});
  if(error) throw new ConnectorHttpError('STATUS_UNAVAILABLE',502); return {connectors:data??[]};
}); }
