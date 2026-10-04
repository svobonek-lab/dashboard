import { authorizeConnectorOwner } from './_connector/ownerAuth.js';
import { parseConnectorBody, requirePost, ConnectorHttpError } from './_connector/http.js';
import { runConnectorHandler } from './_connector/handler.js';
const COMMANDS=new Set(['sync_now','pause','resume','refresh_mapping','rotate_identity','revoke']);
export default async function connectorCommandHandler(request:any,response:any){await runConnectorHandler(response,async()=>{
  requirePost(request); const {body}=parseConnectorBody(request,16*1024); const companyId=String(body.companyId??''),connectorId=String(body.connectorId??''),command=String(body.command??'');
  if(!COMMANDS.has(command)) throw new ConnectorHttpError('COMMAND_INVALID',400); const {userId,service}=await authorizeConnectorOwner(request,companyId);
  const {data,error}=await service.rpc('app_owner_connector_command',{p_company_id:companyId,p_user_id:userId,p_connector_id:connectorId,p_command:command});
  if(error||data!==true) throw new ConnectorHttpError('COMMAND_REJECTED',502); return {accepted:true};
});}
