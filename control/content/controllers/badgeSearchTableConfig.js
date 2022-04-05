
const badgeSearchTableConfig ={
	options:{
		showEditButton:true,
        showDeleteButton:true,
        showHeaders: false,
		allowSearch: true,
	}
	,columns:[
		{
			header:"Name"
			,data:"${data.title}<br><span style='font-weight:100;margin-top: 5px;display: block;'>${data.description}</span>"
			,type:"string"
			,width:"120px"
			,sortBy: 'data.createdOn'
		},
		{
			header:"Conditions"
			,data:"<span style='font-weight:100;margin-top: 5px;display: block;'>Conditions:</span><span style='white-space: initial;font-weight:100;margin-top: 5px;display: block;'>${data.conditions.posts.isTurnedOn ? 'More than ' + data.conditions.posts.value + ' posts' : ''}${data.conditions.posts.isTurnedOn && data.conditions.reactions.isTurnedOn ? ';' : '' }${data.conditions.reactions.isTurnedOn ? ' More than ' + data.conditions.reactions.value + ' reactions' : ''}${(data.conditions.posts.isTurnedOn && data.conditions.reposts.isTurnedOn) || (data.conditions.reactions.isTurnedOn && data.conditions.reposts.isTurnedOn) ? ';' : '' }${data.conditions.reposts.isTurnedOn ? ' More than ' + data.conditions.reposts.value + ' reposts' : ''}</span>"
			,type:"string"
			,width:"120px"
			,sortBy: 'data.createdOn'
		},
		{
			header:"Expires in"
			,data:"<span style='font-weight:100;margin-top: 5px;display: block;'>Expires in:</span><span style='white-space: initial;font-weight:100;margin-top: 5px;display: block;'>${data.expires.isTurnedOn ? data.expires.number + ' ' +  data.expires.frame[0].toUpperCase() + data.expires.frame.slice(1) : 'Never'}</span>"
			,type:"string"
			,width:"120px"
			,sortBy: 'data.createdOn'
		}
		
	]

};
