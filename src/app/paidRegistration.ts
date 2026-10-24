export interface RegistrationFields { companyName:string; slug:string; ownerName:string }
export interface RegistrationDraft extends RegistrationFields {
 requestId:string;
 legalConsent:{termsAccepted:true;dpaAccepted:true;acceptedAt:string};
}
export function registrationPayload(
 fields:RegistrationFields,previous:RegistrationDraft|null,
 uuid:()=>string=()=>crypto.randomUUID(),now:()=>string=()=>new Date().toISOString(),
):RegistrationDraft{
 if(previous){
  if(previous.companyName!==fields.companyName||previous.slug!==fields.slug||previous.ownerName!==fields.ownerName)
   throw new Error('Dokončete rozpracovanou registraci s původními údaji nebo kontaktujte podporu.');
  return previous;
 }
 return {...fields,requestId:uuid(),legalConsent:{termsAccepted:true,dpaAccepted:true,acceptedAt:now()}};
}
export function activationReady(
 member:{role:string;active:boolean}|null,company:{subscription_status?:string;active:boolean}|null,
):boolean {
 return member?.role==='owner' && member.active===true && company?.active===true
  && (company.subscription_status==='active'||company.subscription_status==='trialing');
}
