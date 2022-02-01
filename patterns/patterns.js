const openModal = (event) => {    
    document.getElementById("modal-image").src = event.target.src;    
    document.getElementById("myModal").style.display = "block";    
};

const closeModal = (event) => {    
    document.getElementById("myModal").style.display = "none";   
};

var galleryItems = document.getElementsByClassName("gallery-item");

for (var i = 0; i < galleryItems.length; i++) {    
    galleryItems[i].children[0].addEventListener('click', openModal, false);
}

var modal = document.getElementById("myModal");
// modal.style.display = 'none';
modal.addEventListener('click', closeModal, false);