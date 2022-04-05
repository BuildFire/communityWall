
const searchTableConfig ={
	options:{
		showEditButton:false,
        showDeleteButton:true,
        showHeaders: false,
		allowSearch: true,
	}
	,columns:[
		{
			header:"Name"
			,data:"${data.name}"
			,type:"string"
			,width:"120px"
			,sortBy: 'data.createdOn'
		}
		
	]

};