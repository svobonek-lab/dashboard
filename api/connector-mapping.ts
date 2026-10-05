import { authorizeConnectorOwner } from './_connector/ownerAuth.js';
import { parseConnectorBody, requirePost, ConnectorHttpError } from './_connector/http.js';
import { runConnectorHandler } from './_connector/handler.js';
import { validateConnectorMapping, validateSourceSchema } from './_connector/validation.js';
export default async function connectorMappingHandler(request:any,response:any){await runConnectorHandler(response,async()=>{
  requirePost(request); const {body}=parseConnectorBody(request); const companyId=String(body.companyId??''), connectorId=String(body.connectorId??'');
  if(!body.mapping||typeof body.mapping!=='object'||JSON.stringify(body.mapping).length>100000) throw new ConnectorHttpError('MAPPING_INVALID',400);
  const {userId,service}=await authorizeConnectorOwner(request,companyId);
  const {data:connector,error:connectorError}=await service.from('app_connectors').select('source_schema').eq('id',connectorId).eq('company_id',companyId).is('revoked_at',null).maybeSingle();
  if(connectorError||!connector?.source_schema) throw new ConnectorHttpError('SOURCE_SCHEMA_UNAVAILABLE',409);
  const mapping=validateConnectorMapping(body.mapping,validateSourceSchema(connector.source_schema));
  const {data,error}=await service.rpc('app_save_connector_mapping',{p_company_id:companyId,p_user_id:userId,p_connector_id:connectorId,p_definition:mapping});
  if(error) throw new ConnectorHttpError('MAPPING_REJECTED',502); return {mappingVersion:Number(data)};
});}
